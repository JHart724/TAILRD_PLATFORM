import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, DollarSign, Users, ChevronDown, ChevronUp, Target, Heart, Activity, Pill, Stethoscope, TrendingUp, Zap, Info, Search, Radio, FileText } from 'lucide-react';
import { classifyASSeverity } from '../../../../utils/clinicalCalculators';
import { computeTrajectory, computeTimeHorizon, projectASProgression, projectBAVProgression, trajectoryDisplay, timeHorizonDisplay, formatDollar, type TrajectoryResult, type TrajectoryDistribution } from '../../../../utils/predictiveCalculators';
import GapActionButtons from '../../../../components/shared/GapActionButtons';
import { useGapActions } from '../../../../hooks/useGapActions';

// ============================================================
// CLINICAL GAP DETECTION — STRUCTURAL HEART MODULE
// Gaps: 3 (Asymptomatic Severe AS), 5 (Functional MR + COAPT),
//       8 (Tricuspid Intervention)
//       79 (Moderate AS Surveillance), 80 (Post-TAVR Echo), 81 (Rheumatic MS Warfarin),
//       82 (BAV Aortopathy), 83 (Endocarditis Prophylaxis),
//       sh-9 (Low-Flow Low-Gradient AS DSE), sh-10 (Paravalvular Leak Post-TAVR),
//       sh-11 (TAVR CT Sizing), sh-12 (PFO Closure Cryptogenic Stroke),
//       sh-13 (TEER COAPT vs MITRA-FR), sh-14 (Cerebral Embolic Protection TAVR),
//       sh-15 (Post-TAVR Antithrombotic), sh-16 (PCI + TAVR Timing),
//       sh-17 (Alcohol Septal Ablation HCM), sh-18 (Balloon Mitral Commissurotomy),
//       sh-19 (Post-TEER Antithrombotic), sh-20 (TAVR-in-TAVR Feasibility),
//       sh-21 (Severe AR Surveillance), sh-22 (ASD Device Closure),
//       sh-23 (Primary MR Surgical Repair Timing), sh-24 (BASILICA Pre-TAVR)
// ============================================================

export interface SHClinicalGap {
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
  patients: SHGapPatient[];
  subcategories?: { label: string; count: number }[];
  ctaMap?: Record<string, string>;
  tag?: string;
  whyMissed?: string;
  whyTailrd?: string;
  methodologyNote?: string;
}

export interface SHGapPatient {
  id: string;
  name: string;
  mrn: string;
  age: number;
  signals: string[];
  keyValues: Record<string, string | number>;
  subflag?: string;
}

// ============================================================
// GAP 3: ASYMPTOMATIC SEVERE AS
// ============================================================
const asSeverePatients: SHGapPatient[] = [
  {
    id: 'SH-AS-001',
    name: 'Josephine Larkin',
    mrn: 'MRN-SH-33201',
    age: 77,
    signals: [
      'Severe AS: Vmax 4.4 m/s on echo',
      'Mean gradient 48 mmHg',
      'AVA 0.82 cm2',
      'Asymptomatic — no exertional dyspnea, no syncope',
      'No TAVR/SAVR in past 12 months',
      'No heart team consult in > 6 months',
    ],
    keyValues: {
      'Vmax': '4.4 m/s',
      'Prior Vmax': 4.1,
      'Vmax Date': '2025-07-01',
      'Mean Gradient': '48 mmHg',
      'AVA': '0.82 cm2',
      'Symptoms': 'None (asymptomatic)',
      'Last Echo': '4 months ago',
      'Heart Team Consult': 'None in 8 months',
    },
  },
  {
    id: 'SH-AS-002',
    name: 'Reginald Thorne',
    mrn: 'MRN-SH-33348',
    age: 72,
    signals: [
      'Severe AS: Vmax 4.1 m/s',
      'Mean gradient 42 mmHg',
      'AVA 0.91 cm2',
      'Asymptomatic — active, walks 2 miles daily',
      'No intervention or referral in past 12 months',
    ],
    keyValues: {
      'Vmax': '4.1 m/s',
      'Mean Gradient': '42 mmHg',
      'AVA': '0.91 cm2',
      'Symptoms': 'None',
      'Last Echo': '6 months ago',
      'Heart Team Consult': 'None in > 12 months',
    },
  },
  {
    id: 'SH-AS-003',
    name: 'Cecilia Norwood',
    mrn: 'MRN-SH-33475',
    age: 80,
    signals: [
      'Severe AS: Vmax 4.7 m/s (very severe)',
      'Mean gradient 55 mmHg',
      'AVA 0.74 cm2',
      'Reports occasional mild fatigue (may be emerging symptoms)',
      'No heart team discussion documented in 9 months',
    ],
    keyValues: {
      'Vmax': '4.7 m/s',
      'Prior Vmax': 4.3,
      'Vmax Date': '2025-05-01',
      'Mean Gradient': '55 mmHg',
      'AVA': '0.74 cm2',
      'Symptoms': 'Equivocal — mild fatigue',
      'Last Echo': '3 months ago',
      'Heart Team Consult': 'None in 9 months',
    },
  },
];

// ============================================================
// GAP 5: FUNCTIONAL MR + COAPT CRITERIA
// ============================================================
const functionalMRPatients: SHGapPatient[] = [
  {
    id: 'SH-FMR-001',
    name: 'Marvin Delacroix',
    mrn: 'MRN-SH-45201',
    age: 66,
    signals: [
      'Functional MR + HFrEF (LVEF 35%)',
      'Missing GDMT pillar: NOT on SGLT2i',
      'Sub-flag 5a: GDMT not optimized before MR intervention',
    ],
    keyValues: {
      'LVEF': '35%',
      'LVESD': '55mm',
      'EROA': '0.28 cm2',
      'MR Grade': 'Moderate-severe (3+)',
      'Missing GDMT': 'SGLT2i not prescribed',
      'Current GDMT': 'ARNI, BB, MRA (3 of 4 pillars)',
    },
    subflag: '5a: GDMT Not Optimized',
  },
  {
    id: 'SH-FMR-002',
    name: 'Norma Espinoza',
    mrn: 'MRN-SH-45338',
    age: 71,
    signals: [
      'Functional MR — COAPT criteria met (Sub-flag 5b)',
      'LVEF 32% (20-50%)',
      'LVESD 58mm (<= 70mm)',
      'EROA 0.38 cm2 (>= 0.3 cm2)',
      'On optimized GDMT (all 4 pillars)',
      'No MitraClip in past 12 months',
    ],
    keyValues: {
      'LVEF': '32%',
      'LVESD': '58mm',
      'EROA': '0.38 cm2',
      'GDMT Status': 'Fully optimized (all 4 pillars)',
      'MitraClip': 'None in 12 months',
      'Missing GDMT': 'None',
    },
    subflag: '5b: COAPT Criteria Met',
  },
  {
    id: 'SH-FMR-003',
    name: 'Terrence Oluwa',
    mrn: 'MRN-SH-45467',
    age: 63,
    signals: [
      'Functional MR — COAPT criteria met',
      'LVEF 28%',
      'LVESD 62mm',
      'EROA 0.35 cm2',
      'On optimized GDMT',
      'Heart team review not yet performed',
    ],
    keyValues: {
      'LVEF': '28%',
      'LVESD': '62mm',
      'EROA': '0.35 cm2',
      'GDMT Status': 'Fully optimized',
      'MitraClip': 'None',
      'Missing GDMT': 'None',
    },
    subflag: '5b: COAPT Criteria Met',
  },
  {
    id: 'SH-FMR-004',
    name: 'Adelaide Frost',
    mrn: 'MRN-SH-45583',
    age: 69,
    signals: [
      'Functional MR + HFrEF (LVEF 38%)',
      'Missing GDMT pillars: NOT on MRA or SGLT2i',
      'Sub-flag 5a: Must optimize GDMT before considering intervention',
    ],
    keyValues: {
      'LVEF': '38%',
      'LVESD': '52mm',
      'EROA': '0.25 cm2',
      'MR Grade': 'Moderate (2-3+)',
      'Missing GDMT': 'MRA and SGLT2i',
      'Current GDMT': 'ARNI, BB (2 of 4 pillars)',
    },
    subflag: '5a: GDMT Not Optimized',
  },
];

// ============================================================
// GAP 8: TRICUSPID INTERVENTION
// ============================================================
const tricuspidPatients: SHGapPatient[] = [
  {
    id: 'SH-TR-001',
    name: 'Lavinia Combs',
    mrn: 'MRN-SH-56201',
    age: 74,
    signals: [
      'TR >= moderate-severe (vena contracta 8mm)',
      'NYHA Class III',
      'On loop diuretic (furosemide 80mg)',
      'No TV intervention in 12 months',
      'No structural referral in > 6 months',
    ],
    keyValues: {
      'TR Grade': 'Severe (4+)',
      'Vena Contracta': '8mm',
      'EROA': '48mm2',
      'NYHA Class': 'III',
      'Loop Diuretic': 'Furosemide 80mg daily',
      'Structural Referral': 'None in 8 months',
    },
  },
  {
    id: 'SH-TR-002',
    name: 'Clifton Hays',
    mrn: 'MRN-SH-56338',
    age: 79,
    signals: [
      'TR moderate-severe (vena contracta 7mm)',
      'NYHA Class II-III',
      'Loop diuretic dependent',
      'T-TEER candidate (TriClip anatomy favorable)',
      'No intervention performed',
    ],
    keyValues: {
      'TR Grade': 'Moderate-Severe (3-4+)',
      'Vena Contracta': '7mm',
      'EROA': '42mm2',
      'NYHA Class': 'II-III',
      'Loop Diuretic': 'Torsemide 20mg daily',
      'Candidate Type': 'T-TEER (TriClip)',
    },
  },
  {
    id: 'SH-TR-003',
    name: 'Eulalia Prescott',
    mrn: 'MRN-SH-56465',
    age: 72,
    signals: [
      'Massive/torrential TR (vena contracta 11mm)',
      'NYHA Class III',
      'Severe diuretic dependence',
      'TTVR candidate (EVOQUE — large annulus)',
      'No structural evaluation in 7 months',
    ],
    keyValues: {
      'TR Grade': 'Massive/Torrential (5+)',
      'Vena Contracta': '11mm',
      'EROA': '68mm2',
      'NYHA Class': 'III',
      'Loop Diuretic': 'Furosemide 120mg BID',
      'Candidate Type': 'TTVR (EVOQUE)',
    },
  },
];

// ============================================================
// MASTER GAP DATA
// ============================================================
export const SH_CLINICAL_GAPS: SHClinicalGap[] = [
  {
    id: 'sh-gap-3-asymp-severe-as',
    name: 'Asymptomatic Severe AS — Heart Team Review Overdue',
    category: 'Growth',
    patientCount: 26,
    dollarOpportunity: 1872000,
    methodologyNote: "[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVR/year x 20% asymptomatic screening pool x 50% referral gap x 35% market share = ~13/year. 2-year pipeline = 26. Dollar opportunity: $72,000 TAVR DRG x 26 patients = $1,872,000 (full procedural DRG — EARLY TAVR candidates who convert generate full facility revenue). EARLY TAVR trial (Genereux, NEJM 2024).",
    evidence:
      'EARLY TAVR trial (Genereux, NEJM 2024): early TAVR vs surveillance reduced primary composite by 50% (HR 0.50, P<0.001). FDA approved Sapien 3 for asymptomatic severe AS patients in 2025.',
    cta: 'Refer for Heart Team Review',
    priority: 'high',
    detectionCriteria: [
      'Severe AS: Vmax >= 4.0 m/s OR mean gradient >= 40 mmHg OR AVA < 1.0 cm2',
      'No current symptoms (no dyspnea on exertion, no syncope, no angina)',
      'No TAVR or SAVR performed in past 12 months',
      'No documented heart team consult in past 6 months',
    ],
    patients: asSeverePatients,
    whyMissed: 'Asymptomatic severe AS monitoring requires connecting echo severity with Heart Team review scheduling — patients with severe AS are known but review timing is not systematically tracked.',
    whyTailrd: 'TAILRD connected echo-confirmed severe AS with absence of Heart Team review documentation to identify this overdue evaluation.',
  },
  {
    id: 'sh-gap-5-functional-mr',
    name: 'Functional MR — TEER Eligibility Unassessed',
    category: 'Gap',
    patientCount: 56,
    dollarOpportunity: 1540000,
    methodologyNote: "[Source: Demo Health System / National Benchmark]. Patient count: 4,000 valve patients x 15% MR candidates = 600. Unassessed ~48% = 288 x 35% market share x 13% ID window = 56. Dollar opportunity: $55,000 TEER DRG x 50% conversion x 56 = $1,540,000 (COAPT-eligible patients with optimized GDMT have high conversion to TEER). COAPT trial (Stone, NEJM 2018).",
    evidence:
      'COAPT trial (Stone, NEJM 2018): MitraClip + GDMT. HF hospitalization: 35.8% vs 67.9%/yr (HR 0.53). All-cause death: 29.1% vs 46.1% (HR 0.62). RESHAPE-HF2 (2024): only 7% of patients on SGLT2i at baseline.',
    cta: 'Refer for Heart Team Review',
    priority: 'high',
    detectionCriteria: [
      'Sub-flag 5a (GDMT Not Optimized): Functional MR + HFrEF + missing at least 1 GDMT pillar — optimize GDMT first',
      'Sub-flag 5b (COAPT Criteria Met): LVEF 20-50% + LVESD <= 70mm + EROA >= 0.3 cm2 + on optimized GDMT + no MitraClip in 12 months',
    ],
    patients: functionalMRPatients,
    whyMissed: 'TEER eligibility assessment requires connecting MR severity with LVEF, LV dimensions, and GDMT optimization — data from echo, medication records, and clinical notes.',
    whyTailrd: 'TAILRD assembled MR severity from echo with LVEF, LV dimensions, and GDMT status to identify this patient\'s TEER eligibility.',
    subcategories: [
      { label: '5a: GDMT Not Optimized (optimize first)', count: 37 },
      { label: '5b: COAPT Criteria Met (refer for TEER)', count: 19 },
    ],
    ctaMap: {
      '5a: GDMT Not Optimized': 'Optimize GDMT First',
      '5b: COAPT Criteria Met': 'Refer for Heart Team Review',
    },
  },
  {
    id: 'sh-gap-8-tricuspid',
    name: 'Significant TR — Transcatheter Intervention Unassessed',
    category: 'Growth',
    patientCount: 31,
    dollarOpportunity: 1705000,
    methodologyNote: "[Source: Demo Health System / National Benchmark]. Patient count: 4,000 valve patients x 4% significant TR x 55% not referred x 35% market share = 31. Dollar opportunity: $55,000 TEER DRG x 31 patients = $1,705,000 (full procedural DRG — new program ramp with 100% of identified patients as addressable market). TRILUMINATE / TRISCEND II data.",
    evidence:
      'TriClip FDA approved (TRILUMINATE). EVOQUE FDA approved (TRISCEND II): TR reduced to mild or less in 94% of patients. Both devices commercially available.',
    cta: 'Refer for Structural Heart Evaluation',
    priority: 'high',
    detectionCriteria: [
      'TR >= moderate-severe: vena contracta >= 7mm OR EROA >= 40mm2',
      'NYHA Class >= II despite medical therapy',
      'On loop diuretic',
      'No TV intervention in past 12 months',
      'No structural heart referral in past 6 months',
      'Sub-classify: T-TEER candidate (TriClip), TTVR candidate (EVOQUE), or needs assessment',
    ],
    patients: tricuspidPatients,
    whyMissed: 'Significant TR assessment for transcatheter intervention is a new treatment paradigm. Standard echo reports document TR severity but no system flags interventional candidacy.',
    whyTailrd: 'TAILRD connected TR severity from echo with symptom documentation and right heart assessment to identify this patient for transcatheter tricuspid evaluation.',
  },
  // ── GAPS 79-83: NEW CLINICAL GAP DETECTION RULES ─────────────────────────
  {
    id: 'sh-gap-79-moderate-as-surveillance',
    name: 'Moderate AS — Echo Surveillance Overdue',
    category: 'Gap',
    patientCount: 120,
    dollarOpportunity: 561600,
    methodologyNote: "[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVR/year x 2.5 moderate AS in surveillance = 950. 36% overdue at any point = 120. Dollar opportunity: echo $450 x 70% completion x 120 = $37,800 + downstream TAVR pipeline: 30% will progress to severe AS within 3 years, creating ~36 TAVR candidates x $72,000 x 20% first-year capture = $518,400. Total ~$561,600 (surveillance echo + downstream TAVR pipeline). ACC/AHA surveillance interval compliance.",
    priority: 'high',
    subcategories: [
      { label: 'Last echo >2 years ago — HIGH PRIORITY (possible progression to severe)', count: 48 },
      { label: 'Last echo 12-24 months ago — surveillance due', count: 72 },
    ],
    evidence:
      'Moderate AS progression: 0.1-0.3 m/s/year increase in Vmax. 30-50% progress from moderate to severe within 5 years. AHA/ACC: echo every 1-2 years for moderate AS. When moderate AS progresses to severe (Vmax >=4.0) it triggers the EARLY TAVR flag (Gap 3). Annual echo if moderate AS + symptoms or high-risk features.',
    cta: 'Schedule Surveillance Echocardiogram',
    detectionCriteria: [
      'Moderate AS on prior echo (Vmax 3.0-3.9 m/s OR mean gradient 20-39 mmHg OR AVA 1.0-1.5 cm2)',
      'No follow-up echo in past 12 months',
      'No TAVR or SAVR performed',
    ],
    patients: [
      {
        id: 'SH-MAS-001',
        name: 'Theodore Blackwood',
        mrn: 'MRN-SH-79001',
        age: 74,
        signals: [
          'Moderate AS on echo 28 months ago: Vmax 3.4 m/s, mean gradient 28 mmHg',
          'No follow-up echo in 28 months',
          'Possible progression to severe — EARLY TAVR criteria may now be met',
        ],
        keyValues: {
          'Last Echo': '28 months ago',
          'Vmax (Last Echo)': '3.7 m/s',
          'Vmax': 3.7,
          'Prior Vmax': 3.35,
          'Vmax Date': '2026-01-15',
          'Prior Vmax Date': '2025-04-15',
          'Mean Gradient': '28 mmHg',
          'AVA': '1.2 cm2',
          'Current Symptoms': 'Mildly symptomatic',
          'Surveillance Due': 'Overdue by 16 months',
        },
      },
      {
        id: 'SH-MAS-002',
        name: 'Gloria Sampson',
        mrn: 'MRN-SH-79002',
        age: 68,
        signals: [
          'Moderate AS: Vmax 3.5 m/s on echo 14 months ago',
          'Annual echo recommended — not performed',
          'Asymptomatic — surveillance especially important to detect symptom onset',
        ],
        keyValues: {
          'Last Echo': '14 months ago',
          'Vmax (Last Echo)': '3.5 m/s',
          'Vmax': 3.5,
          'Prior Vmax': 3.2,
          'Vmax Date': '2026-02-01',
          'Prior Vmax Date': '2025-05-01',
          'Mean Gradient': '22 mmHg',
          'AVA': '1.4 cm2',
          'Symptoms': 'Asymptomatic',
          'Surveillance Due': 'Overdue by 2 months',
        },
      },
      {
        id: 'SH-MAS-003',
        name: 'Franklin Osborne',
        mrn: 'MRN-SH-79003',
        age: 80,
        signals: [
          'Moderate AS: Vmax 3.7 m/s — high end of moderate, near severe threshold',
          'Last echo 18 months ago — overdue',
          'Age 80 + Vmax 3.7: high probability of crossing Vmax 4.0 threshold',
        ],
        keyValues: {
          'Last Echo': '18 months ago',
          'Vmax (Last Echo)': '3.7 m/s (near severe threshold)',
          'Vmax': 3.7,
          'Prior Vmax': 3.4,
          'Vmax Date': '2025-05-01',
          'Mean Gradient': '36 mmHg',
          'AVA': '1.05 cm2',
          'Risk': 'Near severe — urgent surveillance',
          'Symptoms': 'Exertional dyspnea (mild)',
        },
      },
    ],
    whyMissed: 'Moderate AS surveillance requires tracking echo intervals against disease severity — patients with moderate disease are known but progression monitoring intervals are not systematically enforced.',
    whyTailrd: 'TAILRD connected moderate AS diagnosis with echo surveillance timing to identify this overdue progression monitoring.',
  },
  {
    id: 'sh-gap-80-post-tavr-echo',
    name: 'Post-TAVR Baseline Echo Missing',
    category: 'Quality',
    patientCount: 27,
    dollarOpportunity: 8505,
    priority: 'high',
    tag: 'Quality Gap | VARC-3 | TVT Registry',
    evidence:
      'Post-TAVR 30-day TTE: standard of care quality metric. Assesses: post-TAVR gradient (should be <20 mmHg mean), paravalvular leak (PVL >=mild associated with worse outcomes), LVEF recovery, wall motion abnormalities. VARC-3 outcomes definition requires post-procedure echo. STS/ACC TVT Registry: 30-day echo completion is a quality metric for TAVR programs.',
    cta: 'Schedule 30-Day Post-TAVR Echocardiogram',
    detectionCriteria: [
      'TAVR (CPT 33361-33369) in past 90 days',
      'No echo after TAVR procedure date',
      'Patient alive and not re-hospitalized for TAVR complication',
    ],
    patients: [
      {
        id: 'SH-TAVR-001',
        name: 'Irene Whitmore',
        mrn: 'MRN-SH-80001',
        age: 81,
        signals: [
          'TAVR (SAPIEN 3) 35 days ago — no post-TAVR echo performed',
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
          'Outcome Note': '30-day echo caught significant PVL — early re-intervention planned, excellent outcome',
        },
      },
      {
        id: 'SH-TAVR-002',
        name: 'Alvin Mackenzie',
        mrn: 'MRN-SH-80002',
        age: 77,
        signals: [
          'TAVR (EVOLUT R) 55 days ago — no follow-up echo',
          'No post-procedural gradient assessment',
          'PVL not evaluated — >=mild PVL is adverse outcome predictor',
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
        id: 'SH-TAVR-003',
        name: 'Margaret Yuen',
        mrn: 'MRN-SH-80003',
        age: 84,
        signals: [
          'TAVR 22 days ago — in 30-day window, echo not yet scheduled',
          'High-risk TAVR candidate: bicuspid aortic valve + calcification',
          'Post-TAVR echo especially important in complex cases',
          'VARC-3: 30-day outcomes require echo documentation',
        ],
        keyValues: {
          'TAVR Date': '22 days ago',
          'Complexity': 'Bicuspid + heavy calcification',
          'Post-TAVR Echo': 'Not scheduled',
          'VARC-3 Window': '30 days — 8 days remaining',
          'Quality Metric': 'At risk of non-compliance',
          'Valve Type': 'SAPIEN 3 (26mm)',
        },
      },
    ],
    whyMissed: 'Post-TAVR echo scheduling falls in the post-procedural transition between structural heart proceduralists and outpatient follow-up — a process gap in care handoffs.',
    whyTailrd: 'TAILRD connected TAVR procedure date with absence of baseline post-TAVR echocardiography to flag this post-procedural surveillance gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVR/year x 7% missing 30-day echo = 27. Dollar opportunity: echo $450 x 70% completion x 27 = $8,505. VARC-3 / TVT Registry quality metrics.',
  },
  {
    id: 'sh-gap-81-rheumatic-ms-warfarin',
    name: 'Rheumatic MS — Warfarin Not Prescribed',
    category: 'Gap',
    patientCount: 22,
    dollarOpportunity: 0,
    priority: 'high',
    tag: 'INVICTUS | Warfarin Required',
    safetyNote:
      'IMPORTANT: DOACs are NOT appropriate for rheumatic MS. INVICTUS trial (2022): rivaroxaban inferior to warfarin in rheumatic AF with valve disease (HR 1.25 for death + stroke + embolism). Patients on DOAC for rheumatic MS must be switched to warfarin.',
    evidence:
      'Rheumatic MS anticoagulation: Class I for CHA2DS2-VASc >=2 regardless of rhythm. Warfarin specifically required — DOACs not validated. INVICTUS trial (2022): rivaroxaban inferior to warfarin in rheumatic AF with valve disease — HR 1.25 for death + stroke + systemic embolism. Target TTR >65%.',
    cta: 'Switch to Warfarin — DOACs Not Appropriate for Rheumatic MS',
    detectionCriteria: [
      'Rheumatic MS (I05.0) AND CHA2DS2-VASc >=2',
      'NOT on warfarin',
      'On DOAC (flag specifically — DOACs not validated for rheumatic MS) OR on no anticoagulation',
    ],
    patients: [
      {
        id: 'SH-RMS-001',
        name: 'Amelia Subramaniam',
        mrn: 'MRN-SH-81001',
        age: 62,
        signals: [
          'Rheumatic MS (I05.0) + AF — CHA2DS2-VASc 5',
          'On apixaban 5mg BID — DOAC not appropriate for rheumatic MS',
          'INVICTUS: rivaroxaban HR 1.25 vs warfarin — DOAC inferior',
          'Must switch to warfarin — target TTR >65%',
        ],
        keyValues: {
          'Diagnosis': 'Rheumatic MS (I05.0) + AF',
          'Current AC': 'Apixaban 5mg BID — INAPPROPRIATE',
          'CHA2DS2-VASc': '5',
          'INVICTUS Finding': 'DOAC inferior (HR 1.25)',
          'Required': 'Warfarin — target TTR >65%',
          'MVA': '1.2 cm2 (moderate-severe MS)',
        },
      },
      {
        id: 'SH-RMS-002',
        name: 'Priscilla Augustin',
        mrn: 'MRN-SH-81002',
        age: 55,
        signals: [
          'Rheumatic MS — mitral valve area 0.9 cm2 (severe)',
          'Sinus rhythm, CHA2DS2-VASc 3 — anticoagulation indicated',
          'On rivaroxaban 20mg — INVICTUS: inferior to warfarin in this population',
          'Warfarin required — Class I regardless of rhythm in rheumatic MS',
        ],
        keyValues: {
          'Diagnosis': 'Rheumatic MS (severe)',
          'MVA': '0.9 cm2',
          'Rhythm': 'Sinus',
          'Current AC': 'Rivaroxaban 20mg — INAPPROPRIATE',
          'CHA2DS2-VASc': '3',
          'Required': 'Warfarin (Class I for rheumatic MS)',
        },
      },
      {
        id: 'SH-RMS-003',
        name: 'Fatima Osei-Bonsu',
        mrn: 'MRN-SH-81003',
        age: 48,
        signals: [
          'Rheumatic MS (I05.0) — on no anticoagulation despite CHA2DS2-VASc 4',
          'Stroke risk without anticoagulation: high in rheumatic MS + CHA2DS2-VASc >=2',
          'Class I: warfarin (not DOAC) for rheumatic MS + CHA2DS2-VASc >=2',
        ],
        keyValues: {
          'Diagnosis': 'Rheumatic MS (I05.0)',
          'CHA2DS2-VASc': '4',
          'Current AC': 'None — undertreated',
          'MVA': '1.1 cm2',
          'Rhythm': 'AF',
          'Required': 'Warfarin initiation',
        },
      },
    ],
    whyMissed: 'Rheumatic MS anticoagulation requires connecting valve diagnosis with medication list — DOAC prescribing is increasingly default, but is contraindicated in rheumatic MS.',
    whyTailrd: 'TAILRD connected rheumatic mitral stenosis diagnosis with current anticoagulation to identify DOAC use where warfarin is specifically required.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 4,000 valve/structural panel x 0.8% rheumatic MS (I05.0) x CHA2DS2-VASc >=2 x 70% not on warfarin = 22. Dollar opportunity: $0 direct revenue. Safety gap — warfarin required, DOACs contraindicated. INVICTUS trial. Diverse metro population.',
  },
  {
    id: 'sh-gap-82-bav-aortopathy',
    name: 'BAV Aortopathy — Aortic Imaging Overdue',
    category: 'Gap',
    patientCount: 36,
    dollarOpportunity: 20160,
    priority: 'high',
    subcategories: [
      { label: 'Prior aortic measurement >=4.5cm — URGENT (annual imaging required)', count: 12 },
      { label: 'Prior measurement <4.5cm — surveillance overdue', count: 24 },
    ],
    evidence:
      'BAV aortopathy affects 50-80% of BAV patients — ascending aorta dilation independent of valve hemodynamics. Intervention thresholds: elective repair >=5.5cm (or >=5.0cm with rapid growth, family history, planned pregnancy). Annual surveillance when >=4.5cm. BAV dissection risk 8x higher than general population.',
    cta: 'Order Aortic Root/Ascending Aorta Imaging',
    detectionCriteria: [
      'BAV (Q23.0) AND no aortic root or ascending aorta imaging in past 2 years',
      'No prior aortic surgery',
      'Sub-classify by prior aortic dimension: >=4.5cm URGENT vs <4.5cm HIGH',
    ],
    patients: [
      {
        id: 'SH-BAV-001',
        name: 'Christopher Dunbar',
        mrn: 'MRN-SH-82001',
        age: 42,
        signals: [
          'BAV (Q23.0) — aortic root 4.6cm on last echo 2.5 years ago',
          'URGENT: >=4.5cm requires annual imaging',
          'No imaging in 2.5 years — possible progression to intervention threshold',
          'Dissection risk 8x general population',
        ],
        keyValues: {
          'BAV Diagnosis': 'Q23.0 confirmed',
          'Last Aortic Measurement': '4.4cm (2.5 years ago)',
          'Aortic Root': 4.4,
          'Prior Aortic Root': 4.0,
          'Root Measure Date': '2026-01-01',
          'Prior Root Date': '2025-04-01',
          'Aortic Root Date': '2025-05-01',
          'Imaging Frequency': 'Annual required (>=4.5cm)',
          'Last Imaging': '2.5 years ago — OVERDUE',
          'Intervention Threshold': '5.5cm (or 5.0cm with risk factors)',
          'Priority': 'URGENT',
        },
      },
      {
        id: 'SH-BAV-002',
        name: 'Rebecca Halvorsen',
        mrn: 'MRN-SH-82002',
        age: 35,
        signals: [
          'BAV with known aortopathy — ascending aorta 4.1cm (3 years ago)',
          'No follow-up imaging in 3 years',
          '2-year surveillance indicated — overdue by 1 year',
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
        id: 'SH-BAV-003',
        name: 'Nathan Forsythe',
        mrn: 'MRN-SH-82003',
        age: 48,
        signals: [
          'BAV — aortic root 4.8cm on last imaging 2 years ago',
          'URGENT: >=4.5cm + 2 years without imaging',
          'Rapid growth possible — may now be approaching 5.0-5.5cm range',
          'Elective surgery indicated at >=5.5cm (or 5.0 with risk factors)',
        ],
        keyValues: {
          'BAV Diagnosis': 'Q23.0',
          'Last Aortic Measurement': '4.6cm (2 years ago)',
          'Aortic Root': 4.6,
          'Prior Aortic Root': 4.3,
          'Root Measure Date': '2025-12-01',
          'Prior Root Date': '2025-03-01',
          'Aortic Root Date': '2025-05-01',
          'Current Estimated Range': '5.0-5.3cm (possible)',
          'Last Imaging': '2 years ago',
          'Intervention Threshold': '5.5cm (or 5.0cm + risk factors)',
          'Priority': 'URGENT',
        },
      },
    ],
    whyMissed: 'BAV aortopathy surveillance requires connecting valve morphology with aortic root imaging intervals — the aortopathy risk is often overlooked when valve function is the primary focus.',
    whyTailrd: 'TAILRD connected bicuspid valve morphology with aortic root dimension history to identify overdue aortopathy surveillance.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 4,000 valve/structural panel x 2% BAV (Q23.0) x 60% aortopathy x 15% surveillance gap = 5, plus broader echo database yields ~36. Dollar opportunity: CTA aorta $800 x 70% completion x 36 = $20,160. ACC/AHA 2022 surveillance criteria.',
  },
  {
    id: 'sh-gap-83-endocarditis-prophylaxis',
    name: 'High-Risk Cardiac Condition — Endocarditis Prophylaxis Protocol Absent',
    category: 'Gap',
    patientCount: 63,
    dollarOpportunity: 19845,
    priority: 'medium',
    evidence:
      'AHA 2007 Endocarditis Prevention Guidelines (reaffirmed 2021): Prophylaxis for highest-risk: prosthetic cardiac valve, prior IE, certain CHD, cardiac transplant with valvulopathy. Regimen: amoxicillin 2g PO 30-60 min before dental. Clindamycin no longer recommended (C. diff risk). Alternatives: cephalexin 2g, azithromycin 500mg for penicillin allergy.',
    cta: 'Document Endocarditis Prophylaxis Protocol',
    detectionCriteria: [
      'Prosthetic heart valve (Z95.2-Z95.4) OR prior endocarditis (I33.x) OR complex CHD (Q20-Q26)',
      'No dental prophylaxis protocol documented in chart',
      'Dental visit documented in past 12 months without prophylaxis note',
    ],
    patients: [
      {
        id: 'SH-IE-001',
        name: 'Dorothy Stafford',
        mrn: 'MRN-SH-83001',
        age: 72,
        signals: [
          'Prosthetic aortic valve (Z95.2) — TAVR 3 years ago',
          'Dental visit 4 months ago — no prophylaxis protocol in chart',
          'AHA: highest-risk category — prophylaxis required before dental procedures',
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
        id: 'SH-IE-002',
        name: 'Roland Adeyemi',
        mrn: 'MRN-SH-83002',
        age: 58,
        signals: [
          'Prior infective endocarditis (I33.0) — 5 years ago',
          'Dental cleanings x2 in past 12 months — no prophylaxis noted',
          'Prior IE: highest-risk category per AHA guidelines',
          'No allergy to penicillin — amoxicillin 2g regimen indicated',
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
        id: 'SH-IE-003',
        name: 'Sylvia Okafor',
        mrn: 'MRN-SH-83003',
        age: 45,
        signals: [
          'Prosthetic mitral valve (Z95.3) — surgical MVR 8 years ago',
          'Dental extraction 6 months ago — no pre-procedure prophylaxis documented',
          'Highest-risk category: mechanical prosthetic valve',
          'Clindamycin no longer recommended (C. diff risk) — use cephalexin if penicillin allergy',
        ],
        keyValues: {
          'Condition': 'Prosthetic mitral valve (mechanical MVR)',
          'Risk Category': 'Highest (AHA)',
          'Dental Extraction': '6 months ago',
          'Prophylaxis': 'Not documented',
          'Penicillin Allergy': 'Yes — cephalexin 2g alternative',
          'Required Regimen': 'Cephalexin 2g (penicillin allergy)',
        },
      },
    ],
    whyMissed: 'Endocarditis prophylaxis documentation requires connecting high-risk cardiac conditions with dental/procedural encounters — information in separate clinical systems.',
    whyTailrd: 'TAILRD connected high-risk cardiac condition (prosthetic valve, prior endocarditis) with absence of documented endocarditis prophylaxis protocol.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 4,000 valve/structural panel x 15% prosthetic valve = 600 x 15% dental visits without prophylaxis doc x 70% identifiable = 63. Dollar opportunity: echo surveillance $450 x 70% completion x 63 = $19,845. AHA 2007/2021 guidelines.',
  },
  // ── NEW GAPS sh-9 through sh-14 (CATHETER-BASED ONLY) ───────────
  {
    id: 'sh-gap-9-low-flow-low-gradient-as',
    name: 'Low-Flow Low-Gradient AS — Dobutamine Stress Echo Not Ordered',
    category: 'Gap',
    patientCount: 25,
    dollarOpportunity: 540000,
    priority: 'high',
    evidence:
      'Clavel MA et al, JACC 2016. Nishimura RA et al, 2020 ACC/AHA Valve Guidelines (Class I recommendation). Dobutamine stress echo differentiates true-severe from pseudo-severe AS. True-severe AS on DSE: TAVR/SAVR indicated. Pseudo-severe: medical management.',
    cta: 'Order Dobutamine Stress Echo — Confirm AS Severity',
    detectionCriteria: [
      'Low-gradient aortic stenosis: mean gradient <40 mmHg AND AVA <1.0 cm2',
      'LVEF <50%',
      'No dobutamine stress echo (CPT 93351) performed',
      'No TAVR or SAVR in past 12 months',
    ],
    patients: [
      {
        id: 'SH-LFLG-001',
        name: 'Bernard Ashworth',
        mrn: 'MRN-SH-09001',
        age: 76,
        signals: [
          'Low-gradient AS: mean gradient 32 mmHg, AVA 0.85 cm2, LVEF 38%',
          'No dobutamine stress echo ordered — true-severe vs pseudo-severe not determined',
          'ACC/AHA Class I: DSE to differentiate severity in low-flow low-gradient AS',
          'TAVR candidacy depends on DSE result — true-severe proceeds to intervention',
        ],
        keyValues: {
          'Mean Gradient': '32 mmHg',
          'AVA': '0.85 cm2',
          'LVEF': '38%',
          'Dobutamine Stress Echo': 'Not ordered',
          'Classification': 'Low-flow low-gradient — severity undetermined',
          'TAVR Candidacy': 'Pending DSE result',
        },
      },
      {
        id: 'SH-LFLG-002',
        name: 'Estelle Kovach',
        mrn: 'MRN-SH-09002',
        age: 81,
        signals: [
          'Low-gradient AS: mean gradient 28 mmHg, AVA 0.78 cm2, LVEF 42%',
          'Paradoxical low-flow low-gradient AS — small ventricle, normal EF borderline',
          'No DSE ordered — CT calcium scoring or DSE needed to confirm severity',
          'If true-severe: TAVR indicated with improved outcomes vs medical management',
        ],
        keyValues: {
          'Mean Gradient': '28 mmHg',
          'AVA': '0.78 cm2',
          'LVEF': '42%',
          'Stroke Volume Index': '32 mL/m2 (low flow)',
          'Dobutamine Stress Echo': 'Not ordered',
          'CT Calcium Score': 'Not ordered',
        },
      },
      {
        id: 'SH-LFLG-003',
        name: 'Norman Pettigrew',
        mrn: 'MRN-SH-09003',
        age: 69,
        signals: [
          'Low-gradient AS: mean gradient 35 mmHg, AVA 0.92 cm2, LVEF 35%',
          'Ischemic cardiomyopathy with concomitant AS — severity unclear',
          'DSE will determine if AS is truly severe or pseudo-severe from low flow',
          'Treatment strategy entirely depends on DSE outcome',
        ],
        keyValues: {
          'Mean Gradient': '35 mmHg',
          'AVA': '0.92 cm2',
          'LVEF': '35%',
          'Etiology': 'Ischemic cardiomyopathy + AS',
          'Dobutamine Stress Echo': 'Not ordered',
          'True-Severe vs Pseudo': 'Undetermined',
        },
      },
    ],
    whyMissed: 'Low-flow low-gradient AS requires connecting low gradient with low LVEF and recognizing that dobutamine stress echo is needed to clarify severity — not routinely ordered by general cardiology.',
    whyTailrd: 'TAILRD identified low-gradient AS with reduced LVEF and absence of dobutamine stress echo to flag this guideline-recommended diagnostic workup gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVRs x 15% low-flow low-gradient presentation x 45% without DSE = ~25 patients. Dollar opportunity: $72,000 TAVR x 30% conversion x 25 = ~$540K (patients confirmed as true-severe proceed to intervention).',
  },
  {
    id: 'sh-gap-10-paravalvular-leak',
    name: 'Paravalvular Leak Post-TAVR — Not Addressed',
    category: 'Quality',
    patientCount: 18,
    dollarOpportunity: 189000,
    priority: 'high',
    evidence:
      'Kodali SK et al, JACC 2015. PARTNER trial: moderate+ PVL associated with 2x increased 2-year mortality. Percutaneous PVL closure success rate >85%. Post-TAVR patients with moderate or greater PVL require intervention assessment.',
    cta: 'Evaluate for Percutaneous PVL Closure',
    detectionCriteria: [
      'Prior TAVR (CPT 33361-33369)',
      'Follow-up echocardiogram showing moderate or greater paravalvular leak',
      'No percutaneous PVL closure or valve-in-valve procedure performed or planned',
      'Symptoms of heart failure or hemolysis may be present',
    ],
    patients: [
      {
        id: 'SH-PVL-001',
        name: 'Genevieve Harlan',
        mrn: 'MRN-SH-10001',
        age: 79,
        signals: [
          'TAVR 14 months ago — moderate paravalvular leak on follow-up echo',
          'PVL causing progressive exertional dyspnea (NYHA II)',
          'PARTNER: moderate+ PVL associated with 2x increased 2-year mortality',
          'Percutaneous PVL closure not discussed or referred',
        ],
        keyValues: {
          'TAVR Date': '14 months ago',
          'PVL Grade': 'Moderate',
          'Symptoms': 'NYHA II — exertional dyspnea',
          'PVL Closure Referral': 'No',
          'Echo Date': '3 months ago',
          'Hemolysis Labs': 'LDH mildly elevated',
        },
      },
      {
        id: 'SH-PVL-002',
        name: 'Wallace Tremaine',
        mrn: 'MRN-SH-10002',
        age: 83,
        signals: [
          'TAVR 8 months ago — moderate-severe PVL with hemolytic anemia',
          'LDH 450, haptoglobin <10, reticulocyte count elevated',
          'PVL causing both hemodynamic compromise and hemolysis',
          'Percutaneous PVL closure or valve-in-valve indicated',
        ],
        keyValues: {
          'TAVR Date': '8 months ago',
          'PVL Grade': 'Moderate-severe',
          'LDH': '450 U/L',
          'Haptoglobin': '<10 mg/dL',
          'Symptoms': 'NYHA III + hemolytic anemia',
          'PVL Closure Referral': 'No',
        },
      },
      {
        id: 'SH-PVL-003',
        name: 'Rosemary Calderon',
        mrn: 'MRN-SH-10003',
        age: 74,
        signals: [
          'TAVR 20 months ago — moderate PVL unchanged from 6-month echo',
          'Asymptomatic but PVL associated with increased long-term mortality',
          'Surveillance recommended at minimum; PVL closure if progression',
          'Valve-in-valve option if anatomy suitable',
        ],
        keyValues: {
          'TAVR Date': '20 months ago',
          'PVL Grade': 'Moderate (stable)',
          'Symptoms': 'Asymptomatic',
          'PVL Closure Referral': 'No',
          'Trend': 'Stable — close surveillance or elective closure',
        },
      },
    ],
    whyMissed: 'Post-TAVR paravalvular leak requires connecting follow-up echo findings with procedural history and hemolysis labs — data from echocardiography, procedure records, and laboratory systems.',
    whyTailrd: 'TAILRD connected post-TAVR echo findings showing moderate+ PVL with absence of PVL closure evaluation to identify this quality gap.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVRs x 12% moderate+ PVL x 40% not addressed = ~18 patients. Dollar opportunity: $35,000 PVL closure x 30% conversion x 18 = ~$189K.',
  },
  {
    id: 'sh-gap-11-tavr-ct-sizing',
    name: 'TAVR CT Sizing Protocol Incomplete — Annular Measurements Missing',
    category: 'Quality',
    patientCount: 22,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      'Blanke P et al, JACC Imaging 2019. Standardized CT protocol reduces sizing errors from 15% to <3%. Incomplete annular measurements increase risk of paravalvular leak and annular rupture.',
    cta: 'Complete CT Sizing Protocol — Repeat Imaging if Needed',
    detectionCriteria: [
      'TAVR candidate with pre-procedural CT completed',
      'CT report missing one or more: annular area, annular perimeter, aortic valve calcium score, coronary height',
      'SCAI protocol not fully documented',
      'Sizing mismatch risk if measurements incomplete',
    ],
    patients: [
      {
        id: 'SH-CTS-001',
        name: 'Reginald Pemberton',
        mrn: 'MRN-SH-11001',
        age: 78,
        signals: [
          'TAVR candidate — CT completed but annular calcium score not reported',
          'Annular area and perimeter present, but calcium distribution missing',
          'High calcium burden = higher PVL risk, may affect valve selection',
          'Blanke et al: standardized protocol reduces sizing errors from 15% to <3%',
        ],
        keyValues: {
          'CT Date': '6 weeks ago',
          'Annular Area': '485 mm2 (reported)',
          'Annular Perimeter': '78 mm (reported)',
          'Calcium Score': 'Not reported',
          'Coronary Height': 'Reported (14mm LCA, 16mm RCA)',
          'Missing Element': 'Aortic valve calcium scoring',
        },
      },
      {
        id: 'SH-CTS-002',
        name: 'Loretta Buchanan',
        mrn: 'MRN-SH-11002',
        age: 82,
        signals: [
          'TAVR candidate — CT missing coronary ostial height measurements',
          'Low coronary takeoff risk not assessed — critical for valve deployment',
          'Annular measurements present but incomplete protocol',
          'Coronary obstruction risk requires height documentation before TAVR',
        ],
        keyValues: {
          'CT Date': '4 weeks ago',
          'Annular Area': '410 mm2 (reported)',
          'Calcium Score': '3,200 AU (high)',
          'Coronary Height': 'Not measured',
          'Missing Element': 'Coronary ostial height',
          'Risk': 'Coronary obstruction if low takeoff',
        },
      },
      {
        id: 'SH-CTS-003',
        name: 'Douglas Fairweather',
        mrn: 'MRN-SH-11003',
        age: 71,
        signals: [
          'TAVR candidate — CT performed at outside facility, no annular measurements',
          'Raw DICOM available but not processed through 3mensio/Circle CVI',
          'Complete re-analysis needed for sizing — cannot proceed without annular data',
          'Bicuspid valve suspected — specialized measurement protocol required',
        ],
        keyValues: {
          'CT Date': '8 weeks ago (outside facility)',
          'Annular Measurements': 'None — raw data only',
          'Processing': 'Not completed (needs 3mensio/Circle CVI)',
          'Valve Morphology': 'Suspected bicuspid',
          'Missing Element': 'All annular measurements',
        },
      },
    ],
    whyMissed: 'CT sizing protocol completeness requires auditing CT reports against SCAI-mandated measurements — a quality check that depends on structured reporting standards not universally adopted.',
    whyTailrd: 'TAILRD analyzed pre-TAVR CT reports against SCAI standardized measurement checklist to identify incomplete sizing protocols before procedure scheduling.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVRs x 6% incomplete CT per internal audit data = ~22 patients. Dollar opportunity: Quality metric — $0 direct but prevents procedural complications ($50K+ each).',
  },
  {
    id: 'sh-gap-12-pfo-closure',
    name: 'PFO Closure Not Offered — Cryptogenic Stroke + RoPE Score >= 7',
    category: 'Gap',
    patientCount: 15,
    dollarOpportunity: 81000,
    priority: 'high',
    evidence:
      'CLOSE (Mas JL, NEJM 2017). RESPECT (Saver JL, NEJM 2017). DEFENSE-PFO (Lee PH, JACC 2018). PFO closure: 75% relative risk reduction in recurrent stroke vs antiplatelet alone. RoPE Score >= 7 identifies highest benefit patients.',
    cta: 'Refer for PFO Closure — Structural Heart Consultation',
    detectionCriteria: [
      'Cryptogenic stroke (I63.9 or ischemic stroke with no identified etiology)',
      'PFO documented on bubble study or TEE',
      'RoPE Score >= 7 (younger age, no HTN, no DM, cortical stroke pattern)',
      'Not referred for transcatheter PFO closure',
    ],
    patients: [
      {
        id: 'SH-PFO-001',
        name: 'Alicia Drummond',
        mrn: 'MRN-SH-12001',
        age: 42,
        signals: [
          'Cryptogenic stroke — PFO with large shunt and atrial septal aneurysm on TEE',
          'RoPE Score 8 — high probability PFO is stroke etiology',
          'CLOSE trial: PFO closure reduces recurrent stroke 75% vs antiplatelet',
          'Not referred for PFO closure — on aspirin alone',
        ],
        keyValues: {
          'Stroke Type': 'Cryptogenic ischemic stroke',
          'PFO': 'Large shunt + atrial septal aneurysm',
          'RoPE Score': '8',
          'Current Therapy': 'Aspirin 81mg',
          'PFO Closure Referral': 'No',
          'Age': 42,
        },
      },
      {
        id: 'SH-PFO-002',
        name: 'Trevor Sinclair',
        mrn: 'MRN-SH-12002',
        age: 38,
        signals: [
          'Cryptogenic stroke at age 37 — PFO on bubble study',
          'RoPE Score 7 — PFO likely causative',
          'RESPECT: PFO closure superior to medical therapy for cryptogenic stroke',
          'On dual antiplatelet — PFO closure not offered',
        ],
        keyValues: {
          'Stroke Type': 'Cryptogenic ischemic stroke',
          'PFO': 'Moderate shunt on agitated saline study',
          'RoPE Score': '7',
          'Current Therapy': 'ASA + Clopidogrel',
          'PFO Closure Referral': 'No',
          'Age': 38,
        },
      },
      {
        id: 'SH-PFO-003',
        name: 'Naomi Osei',
        mrn: 'MRN-SH-12003',
        age: 48,
        signals: [
          'Recurrent cryptogenic stroke (2 events in 3 years) — PFO with moderate shunt',
          'RoPE Score 7 — meets all trial enrollment criteria',
          'DEFENSE-PFO: PFO closure: 0% recurrent stroke vs 12.9% medical therapy at 2 years',
          'Still managed medically — PFO closure not discussed',
        ],
        keyValues: {
          'Stroke Type': 'Recurrent cryptogenic (2 events)',
          'PFO': 'Moderate shunt',
          'RoPE Score': '7',
          'Recurrence': '2 strokes in 3 years on medical therapy',
          'PFO Closure Referral': 'No',
          'Current Therapy': 'Apixaban (empiric)',
        },
      },
    ],
    whyMissed: 'PFO closure referral for cryptogenic stroke requires connecting stroke etiology workup with bubble study results and RoPE Score calculation — data from neurology, echocardiography, and stroke records.',
    whyTailrd: 'TAILRD connected cryptogenic stroke diagnosis with PFO documentation and computed RoPE Score to identify patients eligible for transcatheter PFO closure.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: cryptogenic stroke volume x PFO prevalence 25% x RoPE >= 7 x not referred x 35% market share = ~15 patients. Dollar opportunity: $18,000 PFO closure x 30% conversion x 15 = ~$81K.',
  },
  {
    id: 'sh-gap-13-teer-coapt-criteria',
    name: 'TEER Patient Selection — COAPT vs MITRA-FR Criteria Not Applied',
    category: 'Quality',
    patientCount: 10,
    dollarOpportunity: 0,
    priority: 'high',
    evidence:
      'Stone GW et al, COAPT (NEJM 2018). Obadia JF et al, MITRA-FR (NEJM 2018). COAPT: 29% mortality reduction. MITRA-FR: no benefit. Key differentiator: disproportionate vs proportionate MR. COAPT criteria: EROA >= 30mm2, LVEDV <200mL, LVEF 20-50%, on optimal GDMT.',
    cta: 'Verify COAPT Criteria Met — Echocardiographic Review',
    detectionCriteria: [
      'Patient referred for TEER mitral',
      'Echocardiographic data does not confirm COAPT criteria (EROA >= 30mm2, LVEDV <200mL, LVEF 20-50%)',
      'MITRA-FR phenotype: proportionate MR with dilated LV (LVEDV >200mL) — no TEER benefit',
      'Optimal GDMT not confirmed for >= 3 months before TEER decision',
    ],
    patients: [
      {
        id: 'SH-COAPT-001',
        name: 'Garrett Woodhouse',
        mrn: 'MRN-SH-13001',
        age: 71,
        signals: [
          'Referred for TEER — LVEDV 225 mL (exceeds COAPT 200 mL cutoff)',
          'EROA 35 mm2, LVEF 32% — MR is proportionate to LV dilation',
          'MITRA-FR phenotype: dilated LV with proportionate MR — no TEER benefit expected',
          'COAPT vs MITRA-FR distinction not documented in referral',
        ],
        keyValues: {
          'EROA': '35 mm2',
          'LVEDV': '225 mL (exceeds COAPT 200 mL cutoff)',
          'LVEF': '32%',
          'MR Classification': 'Proportionate (MITRA-FR phenotype)',
          'GDMT Status': 'Suboptimal — no SGLT2i',
          'COAPT Criteria': 'NOT met — LVEDV too large',
        },
      },
      {
        id: 'SH-COAPT-002',
        name: 'Vivian McAllister',
        mrn: 'MRN-SH-13002',
        age: 66,
        signals: [
          'Referred for TEER — GDMT not optimized (not on sacubitril/valsartan or SGLT2i)',
          'EROA 32 mm2, LVEDV 180 mL, LVEF 28% — would meet COAPT criteria IF on optimal GDMT',
          'COAPT: patients must be on maximal tolerated GDMT >= 3 months before TEER',
          'Optimize GDMT first, then reassess for TEER',
        ],
        keyValues: {
          'EROA': '32 mm2',
          'LVEDV': '180 mL',
          'LVEF': '28%',
          'GDMT Status': 'Not optimized — missing ARNI + SGLT2i',
          'COAPT Criteria': 'Pending — optimize GDMT first',
          'Action': 'GDMT optimization before TEER decision',
        },
      },
      {
        id: 'SH-COAPT-003',
        name: 'Luther Abernathy',
        mrn: 'MRN-SH-13003',
        age: 78,
        signals: [
          'Referred for TEER — EROA 22 mm2 (below COAPT 30 mm2 threshold)',
          'LVEDV 195 mL, LVEF 35% — borderline proportionate MR',
          'COAPT enrolled EROA >= 30 mm2 — this patient below enrollment threshold',
          'Consider continued medical management vs TEER with limited evidence',
        ],
        keyValues: {
          'EROA': '22 mm2 (below COAPT threshold)',
          'LVEDV': '195 mL',
          'LVEF': '35%',
          'MR Classification': 'Borderline — EROA below COAPT',
          'COAPT Criteria': 'NOT met — EROA too low',
          'Recommendation': 'Medical management — reassess in 6 months',
        },
      },
    ],
    whyMissed: 'TEER appropriateness requires applying COAPT vs MITRA-FR selection criteria to echocardiographic measurements and GDMT status — a nuanced distinction not systematically enforced in referral workflows.',
    whyTailrd: 'TAILRD applied COAPT trial inclusion criteria (EROA, LVEDV, LVEF, GDMT status) to TEER referrals to identify patients who may not meet evidence-based selection criteria.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 80 TEER referrals x 12% potentially inappropriate based on MITRA-FR criteria = ~10 patients. Dollar opportunity: Quality/appropriateness — avoids $55,000 procedure with no expected benefit.',
  },
  {
    id: 'sh-gap-14-cerebral-embolic-protection',
    name: 'Cerebral Embolic Protection Not Used — High-Risk TAVR',
    category: 'Quality',
    patientCount: 30,
    dollarOpportunity: 105000,
    priority: 'medium',
    evidence:
      'Kapadia SR et al, PROTECTED TAVR (NEJM 2022, PMID 35139271). Sentinel device: 63% reduction in stroke-related disability at 72 hours. High calcium burden or mobile aortic arch atheroma increases cerebral embolization risk.',
    cta: 'Consider Cerebral Embolic Protection — High-Risk TAVR Protocol',
    detectionCriteria: [
      'TAVR scheduled or recently performed',
      'High calcium burden on pre-procedural CT (calcium score >3,000 AU)',
      'Mobile aortic arch atheroma on CT or TEE',
      'No cerebral embolic protection device (Sentinel) used or planned',
    ],
    patients: [
      {
        id: 'SH-CEP-001',
        name: 'Ignatius Whitmore',
        mrn: 'MRN-SH-14001',
        age: 80,
        signals: [
          'TAVR scheduled — aortic valve calcium score 4,200 AU (very high)',
          'No cerebral embolic protection device planned',
          'PROTECTED TAVR: Sentinel device reduces stroke-related disability 63%',
          'High calcium burden = highest embolization risk during TAVR',
        ],
        keyValues: {
          'TAVR Status': 'Scheduled',
          'AV Calcium Score': '4,200 AU (very high)',
          'Sentinel Device': 'Not planned',
          'Stroke Risk': 'Elevated — high calcium burden',
          'PROTECTED TAVR': 'Sentinel indicated',
        },
      },
      {
        id: 'SH-CEP-002',
        name: 'Margaret Winslow',
        mrn: 'MRN-SH-14002',
        age: 85,
        signals: [
          'TAVR performed 2 weeks ago — mobile aortic arch atheroma on CT',
          'No Sentinel device used during procedure',
          'Post-TAVR MRI: new silent cerebral infarcts (asymptomatic)',
          'PROTECTED TAVR: cerebral embolic protection reduces stroke burden',
        ],
        keyValues: {
          'TAVR Status': 'Completed (2 weeks ago)',
          'Arch Atheroma': 'Mobile — Grade IV',
          'Sentinel Device': 'Not used',
          'Post-TAVR MRI': 'New silent infarcts',
          'Learning': 'Future TAVRs with high-risk features should use CEPD',
        },
      },
      {
        id: 'SH-CEP-003',
        name: 'Russell Fontaine',
        mrn: 'MRN-SH-14003',
        age: 77,
        signals: [
          'TAVR candidate — calcium score 3,800 AU + porcelain aorta',
          'Cerebral embolic protection should be included in procedure plan',
          'Access route also affected by aortic calcification — Sentinel adds cerebral protection',
          'PROTECTED TAVR: procedural add-on with high safety profile',
        ],
        keyValues: {
          'TAVR Status': 'In planning',
          'AV Calcium Score': '3,800 AU',
          'Aortic Calcification': 'Porcelain aorta',
          'Sentinel Device': 'Not in plan',
          'Risk': 'Very high embolization risk',
        },
      },
    ],
    whyMissed: 'Cerebral embolic protection use requires identifying high-risk anatomic features on pre-TAVR CT and incorporating device into procedure planning — a step not universally part of TAVR protocols.',
    whyTailrd: 'TAILRD analyzed pre-TAVR CT calcium scores and aortic arch morphology to identify high-risk patients who would benefit from cerebral embolic protection during TAVR.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVRs x 20% high-risk features x 40% without CEPD = ~30 patients. Dollar opportunity: $3,500 device add-on x 30 = ~$105K.',
  },
  // ============================================================
  // GAP sh-15: POST-TAVR ANTICOAGULATION NOT STANDARDIZED
  // ============================================================
  {
    id: 'sh-gap-15-post-tavr-antithrombotic',
    name: 'Post-TAVR Anticoagulation Not Standardized',
    category: 'Quality',
    patientCount: 50,
    dollarOpportunity: 0,
    priority: 'high',
    evidence:
      'Brouwer S et al, POPular TAVI (NEJM 2020, PMID 32223116). Collet JP et al, ATLANTIS (NEJM 2022). Single antiplatelet (aspirin or clopidogrel) preferred. DOAC may benefit select patients (HALT prevention).',
    cta: 'Apply Standardized Post-TAVR Antithrombotic Protocol',
    detectionCriteria: [
      'TAVR performed within past 6 months',
      'No standardized antithrombotic protocol documented',
      'Significant variation: single antiplatelet vs DAPT vs DOAC',
      'No documented rationale for chosen antithrombotic strategy',
    ],
    patients: [
      {
        id: 'SH-ATH-015-001',
        name: 'Cornelius Ashford',
        mrn: 'MRN-SH-15001',
        age: 82,
        signals: [
          'TAVR 2 months ago — on DAPT (aspirin + clopidogrel) without documented rationale',
          'POPular TAVI: single antiplatelet reduces bleeding without increasing thrombotic events',
          'No AF — DOAC not indicated, DAPT likely unnecessary',
          'Standardized protocol needed for post-TAVR antithrombotic management',
        ],
        keyValues: {
          'TAVR Date': '2 months ago',
          'Current Regimen': 'DAPT (aspirin + clopidogrel)',
          'AF Status': 'No AF',
          'POPular TAVI': 'Single antiplatelet preferred',
          'Protocol': 'Not standardized',
          'Bleeding Risk': 'Elevated (age 82, DAPT unnecessary)',
        },
      },
      {
        id: 'SH-ATH-015-002',
        name: 'Eleanor Whitfield',
        mrn: 'MRN-SH-15002',
        age: 78,
        signals: [
          'TAVR 3 months ago — on apixaban for AF + aspirin (triple therapy risk)',
          'No documented plan to drop aspirin — bleeding risk from triple therapy',
          'ATLANTIS: OAC alone may be sufficient in TAVR + AF patients',
          'Protocol should specify: OAC mono vs OAC + single antiplatelet × limited duration',
        ],
        keyValues: {
          'TAVR Date': '3 months ago',
          'Current Regimen': 'Apixaban + aspirin (dual pathway)',
          'AF Status': 'Persistent AF (CHA₂DS₂-VASc 5)',
          'Protocol': 'Not standardized',
          'ATLANTIS': 'OAC-based strategy preferred',
          'Action': 'Consider dropping aspirin per protocol',
        },
      },
      {
        id: 'SH-ATH-015-003',
        name: 'Theodore Langston',
        mrn: 'MRN-SH-15003',
        age: 75,
        signals: [
          'TAVR 6 weeks ago — on aspirin only (no clopidogrel, no DOAC)',
          'Recent CT: mild leaflet thickening — early HALT concern',
          'No protocol for HALT screening or antithrombotic escalation',
          'Standardized approach: CT at 1 month, antithrombotic based on findings',
        ],
        keyValues: {
          'TAVR Date': '6 weeks ago',
          'Current Regimen': 'Aspirin 81mg only',
          'HALT Screening': 'CT shows mild leaflet thickening',
          'Protocol': 'Not standardized',
          'Concern': 'Early HALT — may need OAC',
          'Action': 'Protocol-driven antithrombotic based on CT findings',
        },
      },
    ],
    whyMissed: 'Post-TAVR antithrombotic management varies between operators and institutions. No single randomized trial provides definitive guidance for all TAVR patients, leading to practice variation.',
    whyTailrd: 'TAILRD identified post-TAVR patients with non-standardized antithrombotic regimens by analyzing medication prescribing patterns and the absence of protocol-driven documentation.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVRs × 38% without standardized protocol ≈ 50. Dollar opportunity: Quality — $0 direct, prevents stroke and bleeding.',
  },
  // ============================================================
  // GAP sh-16: CONCOMITANT PCI + TAVR TIMING NOT DOCUMENTED
  // ============================================================
  {
    id: 'sh-gap-16-pci-tavr-timing',
    name: 'Concomitant PCI + TAVR Timing Not Documented',
    category: 'Quality',
    patientCount: 28,
    dollarOpportunity: 201600,
    priority: 'medium',
    evidence:
      'Patterson T et al, ACTIVATION (Circulation 2021). Singh V et al, JACC Intv 2019. Timing decision (simultaneous vs staged) should be heart-team driven based on anatomy and clinical urgency.',
    cta: 'Document Heart Team Decision — Simultaneous vs Staged PCI Strategy',
    detectionCriteria: [
      'Severe AS requiring TAVR',
      'Significant concomitant CAD requiring revascularization',
      'No documented heart team decision on simultaneous vs staged PCI timing',
    ],
    patients: [
      {
        id: 'SH-PCI-016-001',
        name: 'Herbert Donnelly',
        mrn: 'MRN-SH-16001',
        age: 79,
        signals: [
          'Severe AS (TAVR planned) + 80% proximal LAD stenosis',
          'No documented discussion of simultaneous PCI vs staged approach',
          'ACTIVATION: routine PCI before TAVR did not improve outcomes',
          'Heart team input needed based on anatomy and symptoms',
        ],
        keyValues: {
          'TAVR Status': 'Planned',
          'CAD': '80% proximal LAD',
          'PCI Timing': 'Not documented',
          'ACTIVATION Trial': 'Routine PCI pre-TAVR no benefit',
          'Heart Team': 'Discussion not documented',
          'Recommendation': 'Document simultaneous vs staged strategy',
        },
      },
      {
        id: 'SH-PCI-016-002',
        name: 'Vivian Carmichael',
        mrn: 'MRN-SH-16002',
        age: 84,
        signals: [
          'TAVR scheduled — incidental finding of 90% RCA + 75% LCx',
          'Two-vessel CAD requiring revascularization decision',
          'Staged PCI post-TAVR vs simultaneous — no documentation',
          'Complex decision requires heart team with interventional + structural input',
        ],
        keyValues: {
          'TAVR Status': 'Scheduled (2 weeks)',
          'CAD': '90% RCA + 75% LCx (2-vessel)',
          'PCI Timing': 'Not documented',
          'Heart Team': 'Not convened for CAD strategy',
          'Consideration': 'Staged vs simultaneous approach',
          'SYNTAX Score': 'Intermediate',
        },
      },
      {
        id: 'SH-PCI-016-003',
        name: 'Milton Prescott',
        mrn: 'MRN-SH-16003',
        age: 76,
        signals: [
          'TAVR candidate with ACS presentation — unstable angina + severe AS',
          'PCI performed urgently for culprit lesion — TAVR timing unclear',
          'Post-PCI TAVR timing: 1-3 months vs urgent — no protocol',
          'Need documented plan for TAVR timing post-ACS PCI',
        ],
        keyValues: {
          'Presentation': 'Unstable angina + severe AS',
          'PCI': 'Performed (culprit LAD)',
          'TAVR': 'Needed but timing not documented',
          'Heart Team': 'Discussion needed for TAVR timing',
          'Antithrombotic': 'DAPT post-PCI complicates TAVR timing',
          'Protocol': 'No institutional guideline for ACS + AS',
        },
      },
    ],
    whyMissed: 'PCI and TAVR are performed by different subspecialists (interventional cardiologist vs structural heart). The timing decision requires cross-specialty heart team coordination that may not be formalized.',
    whyTailrd: 'TAILRD identified TAVR candidates with concurrent significant CAD by connecting pre-TAVR CT/angiography findings with the absence of documented heart team timing decisions.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: 380 TAVRs × 25% concurrent CAD × 30% without timing documentation ≈ 28. Dollar opportunity: $24,000 PCI × 28 × 30% conversion = $201.6K.',
  },
  // ============================================================
  // GAP sh-17: ALCOHOL SEPTAL ABLATION NOT OFFERED — OBSTRUCTIVE HCM
  // ============================================================
  {
    id: 'sh-gap-17-alcohol-septal-ablation',
    name: 'Alcohol Septal Ablation Not Offered — Obstructive HCM',
    category: 'Gap',
    patientCount: 10,
    dollarOpportunity: 84000,
    priority: 'medium',
    evidence:
      'Liebregts M et al, Circ Intv 2017. ASA: noninferior to myectomy for gradient reduction in selected anatomy. Avoids sternotomy, shorter recovery.',
    cta: 'Evaluate Septal Perforator Anatomy — Consider Alcohol Septal Ablation',
    detectionCriteria: [
      'Obstructive HCM with LVOT gradient ≥50 mmHg',
      'Symptoms refractory to medical therapy (beta-blocker + disopyramide)',
      'Suitable septal perforator artery on coronary angiography',
      'No evaluation for alcohol septal ablation — referred directly for surgical myectomy',
    ],
    patients: [
      {
        id: 'SH-ASA-017-001',
        name: 'Nathaniel Blackstone',
        mrn: 'MRN-SH-17001',
        age: 68,
        signals: [
          'Obstructive HCM — resting LVOT gradient 72 mmHg',
          'Refractory to metoprolol 200mg + disopyramide 400mg',
          'Referred for surgical myectomy — ASA not evaluated',
          'Coronary angiography: suitable first septal perforator',
        ],
        keyValues: {
          'LVOT Gradient': '72 mmHg (resting)',
          'Septum Thickness': '22mm',
          'Medical Therapy': 'Metoprolol 200mg + disopyramide 400mg (refractory)',
          'Septal Perforator': 'Suitable on angiography',
          'ASA Evaluation': 'Not performed',
          'Myectomy': 'Referred — but ASA may be preferred',
        },
      },
      {
        id: 'SH-ASA-017-002',
        name: 'Barbara Kingsley',
        mrn: 'MRN-SH-17002',
        age: 74,
        signals: [
          'Obstructive HCM — high surgical risk (STS predicted mortality 5.2%)',
          'LVOT gradient 65 mmHg despite medical therapy',
          'ASA: catheter-based alternative avoiding sternotomy',
          'Not evaluated for ASA despite high surgical risk',
        ],
        keyValues: {
          'LVOT Gradient': '65 mmHg',
          'STS Risk': '5.2% (elevated)',
          'Age': 74,
          'ASA Evaluation': 'Not performed',
          'Surgical Risk': 'High — ASA preferred',
          'Septal Perforator': 'Assessment needed',
        },
      },
    ],
    whyMissed: 'Alcohol septal ablation requires interventional expertise and echo-guided myocardial contrast assessment during the procedure. Not all structural heart programs offer ASA, defaulting to surgical myectomy referral.',
    whyTailrd: 'TAILRD identified obstructive HCM patients referred for surgical myectomy without documented ASA evaluation — particularly those with high surgical risk where catheter-based approach would be preferred.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: HCM patients with obstruction × suitable anatomy × not offered × 35% market share ≈ 10. Dollar opportunity: $28,000 procedure × 10 × 30% conversion = $84K.',
  },
  // ============================================================
  // GAP sh-18: BALLOON MITRAL COMMISSUROTOMY NOT CONSIDERED
  // ============================================================
  {
    id: 'sh-gap-18-balloon-mitral-commissurotomy',
    name: 'Balloon Mitral Commissurotomy Not Considered — Rheumatic MS',
    category: 'Gap',
    patientCount: 8,
    dollarOpportunity: 67200,
    priority: 'medium',
    evidence:
      'Iung B et al, EHJ 2002. BMC: equivalent outcomes to surgery for favorable anatomy (Wilkins ≤8). Avoids sternotomy, no prosthesis-related anticoagulation.',
    cta: 'Assess Wilkins Score — Consider Balloon Mitral Commissurotomy',
    detectionCriteria: [
      'Symptomatic rheumatic mitral stenosis (MVA ≤1.5 cm²)',
      'Wilkins echocardiographic score ≤8 (favorable anatomy)',
      'No significant mitral regurgitation (≤2+)',
      'No evaluation for percutaneous BMC — referred directly for surgical MVR',
    ],
    patients: [
      {
        id: 'SH-BMC-018-001',
        name: 'Priya Ramaswamy',
        mrn: 'MRN-SH-18001',
        age: 45,
        signals: [
          'Rheumatic MS — MVA 1.1 cm², mean gradient 14 mmHg',
          'Wilkins score 6 — favorable anatomy for BMC',
          'Referred for surgical MVR — BMC not evaluated',
          'BMC: avoids sternotomy, no prosthetic valve anticoagulation',
        ],
        keyValues: {
          'Valve Area': '1.1 cm² (severe MS)',
          'Mean Gradient': '14 mmHg',
          'Wilkins Score': '6 (favorable — ≤8)',
          'MR Grade': '1+ (mild)',
          'BMC Evaluation': 'Not performed',
          'Surgical Plan': 'MVR — but BMC preferred for Wilkins ≤8',
        },
      },
      {
        id: 'SH-BMC-018-002',
        name: 'Fatima Al-Rashid',
        mrn: 'MRN-SH-18002',
        age: 38,
        signals: [
          'Young woman with rheumatic MS — wishes to avoid sternotomy',
          'MVA 1.3 cm², Wilkins 7 — good candidate for BMC',
          'BMC preserves native valve — avoids lifetime anticoagulation',
          'Not offered BMC despite favorable anatomy',
        ],
        keyValues: {
          'Valve Area': '1.3 cm²',
          'Wilkins Score': '7',
          'Age': 38,
          'MR Grade': 'Trace',
          'BMC Evaluation': 'Not offered',
          'Benefit': 'Avoids sternotomy + prosthetic valve anticoagulation',
        },
      },
    ],
    whyMissed: 'Balloon mitral commissurotomy requires specialized interventional skills and experienced echocardiographic guidance. In regions where rheumatic MS is less common, operators may lack BMC experience and default to surgical referral.',
    whyTailrd: 'TAILRD identified symptomatic rheumatic MS patients with favorable Wilkins scores who were referred for surgical MVR without documented evaluation for percutaneous BMC.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: rheumatic MS × favorable anatomy × not offered × 35% market share ≈ 8. Dollar opportunity: $28,000 procedure × 8 × 30% conversion = $67.2K.',
  },
  // ============================================================
  // GAP sh-19: POST-TEER ANTICOAGULATION NOT PROTOCOLIZED
  // ============================================================
  {
    id: 'sh-gap-19-post-teer-antithrombotic',
    name: 'Post-TEER Anticoagulation Not Protocolized',
    category: 'Quality',
    patientCount: 25,
    dollarOpportunity: 0,
    priority: 'medium',
    evidence:
      'No randomized trial exists. Expert consensus: DAPT × 1 month then single antiplatelet. Patients with AF should continue OAC. Documentation of rationale required.',
    cta: 'Document Post-TEER Antithrombotic Protocol',
    detectionCriteria: [
      'TEER (mitral or tricuspid) performed within past 6 months',
      'No standardized post-TEER antithrombotic protocol documented',
      'Variation in approach: single antiplatelet vs DAPT vs anticoagulation',
      'No documented rationale for antithrombotic selection',
    ],
    patients: [
      {
        id: 'SH-TEER-019-001',
        name: 'Geraldine Pemberton',
        mrn: 'MRN-SH-19001',
        age: 76,
        signals: [
          'Mitral TEER (MitraClip) 2 months ago — on DAPT indefinitely',
          'No documented plan to step down to single antiplatelet',
          'Expert consensus: DAPT × 1 month then single antiplatelet',
          'Prolonged DAPT: unnecessary bleeding risk',
        ],
        keyValues: {
          'Procedure': 'Mitral TEER (MitraClip)',
          'Date': '2 months ago',
          'Current Regimen': 'DAPT (aspirin + clopidogrel)',
          'AF': 'No',
          'Protocol': 'Not documented',
          'Consensus': 'DAPT × 1 month → single antiplatelet',
        },
      },
      {
        id: 'SH-TEER-019-002',
        name: 'Walter Drummond',
        mrn: 'MRN-SH-19002',
        age: 81,
        signals: [
          'Tricuspid TEER 6 weeks ago — on aspirin only',
          'Concurrent persistent AF — should be on OAC',
          'No documentation of antithrombotic rationale',
          'AF patients post-TEER: OAC ± short-course antiplatelet',
        ],
        keyValues: {
          'Procedure': 'Tricuspid TEER',
          'Date': '6 weeks ago',
          'Current Regimen': 'Aspirin 81mg only',
          'AF': 'Persistent AF (CHA₂DS₂-VASc 4)',
          'OAC': 'Not prescribed — should be on anticoagulation',
          'Protocol': 'Not documented',
        },
      },
      {
        id: 'SH-TEER-019-003',
        name: 'Agnes Rutherford',
        mrn: 'MRN-SH-19003',
        age: 72,
        signals: [
          'Mitral TEER 3 months ago — on triple therapy (OAC + DAPT)',
          'Triple therapy: excessive bleeding risk beyond 1 month',
          'No protocol for de-escalation timeline',
          'Should be OAC + single antiplatelet or OAC alone by now',
        ],
        keyValues: {
          'Procedure': 'Mitral TEER',
          'Date': '3 months ago',
          'Current Regimen': 'Apixaban + aspirin + clopidogrel (triple)',
          'AF': 'Paroxysmal AF',
          'Bleeding Risk': 'Excessive on triple therapy at 3 months',
          'Protocol': 'De-escalation not documented',
        },
      },
    ],
    whyMissed: 'No randomized trial defines optimal post-TEER antithrombotic therapy. Operators and institutions develop ad hoc approaches without formal protocols, leading to significant variation and some patients on excessive or insufficient therapy.',
    whyTailrd: 'TAILRD identified post-TEER patients with variable antithrombotic regimens and absent protocol documentation by analyzing procedural dates, medication lists, and AF status.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: (80 TEER mitral + 15 tricuspid) × 65% without protocol × 35% market share ≈ 25. Dollar opportunity: Quality — $0 direct.',
  },
  // ============================================================
  // GAP sh-20: TAVR-IN-TAVR FEASIBILITY NOT ASSESSED
  // ============================================================
  {
    id: 'sh-gap-20-tavr-in-tavr',
    name: 'TAVR-in-TAVR Feasibility Not Assessed — Failing First TAVR',
    category: 'Gap',
    patientCount: 12,
    dollarOpportunity: 259200,
    priority: 'high',
    evidence:
      'Barbanti M et al, EHJ 2023. TAVR-in-TAVR: CT planning essential for coronary access (virtual THV-to-coronary distance). BASILICA technique may be needed.',
    cta: 'CT Planning for TAVR-in-TAVR — Assess Coronary Access and Alignment',
    detectionCriteria: [
      'Prior TAVR with bioprosthetic valve in situ',
      'Elevated gradients or new regurgitation suggesting valve failure',
      'No CT assessment for TAVR-in-TAVR feasibility',
      'No documentation of coronary access risk or neo-commissural alignment',
    ],
    patients: [
      {
        id: 'SH-TIT-020-001',
        name: 'Reginald Worthington',
        mrn: 'MRN-SH-20001',
        age: 83,
        signals: [
          'TAVR (Evolut R 26mm) 6 years ago — mean gradient risen from 8 to 28 mmHg',
          'Structural valve deterioration — may need redo intervention',
          'No CT assessment for TAVR-in-TAVR feasibility',
          'Coronary access risk: virtual THV-to-coronary distance critical',
        ],
        keyValues: {
          'Prior TAVR': 'Evolut R 26mm (6 years ago)',
          'Current Gradient': '28 mmHg (baseline was 8)',
          'Valve Issue': 'Structural deterioration — rising gradients',
          'CT Assessment': 'Not performed for redo planning',
          'Coronary Risk': 'Unknown — needs virtual commissural CT',
          'BASILICA': 'May be needed for coronary protection',
        },
      },
      {
        id: 'SH-TIT-020-002',
        name: 'Edith Crowley',
        mrn: 'MRN-SH-20002',
        age: 78,
        signals: [
          'TAVR (SAPIEN 3 23mm) 5 years ago — new severe AR on echo',
          'Small SAPIEN in small annulus — redo TAVR may cause coronary obstruction',
          'No redo feasibility CT — patient being managed medically',
          'TAVR-in-TAVR vs SAVR decision requires CT planning',
        ],
        keyValues: {
          'Prior TAVR': 'SAPIEN 3 23mm (5 years ago)',
          'Current Issue': 'Severe paravalvular AR',
          'Annulus': 'Small — high risk for coronary obstruction on redo',
          'CT Planning': 'Not performed',
          'Decision': 'TAVR-in-TAVR vs SAVR vs medical — needs CT data',
          'STS Risk': '4.8% (intermediate-high for SAVR)',
        },
      },
      {
        id: 'SH-TIT-020-003',
        name: 'Arthur Kensington',
        mrn: 'MRN-SH-20003',
        age: 86,
        signals: [
          'TAVR 7 years ago — endocarditis treated, now valve thrombosis suspected',
          'Rising gradients + TIA — possible HALT or valve thrombosis',
          'If valve failure confirmed: TAVR-in-TAVR feasibility assessment needed',
          'Frail patient — redo SAVR very high risk',
        ],
        keyValues: {
          'Prior TAVR': '7 years ago (valve type not documented)',
          'Current Gradient': '32 mmHg (rising)',
          'Suspected Issue': 'Valve thrombosis vs HALT',
          'CT Planning': 'Not performed for redo assessment',
          'Frailty': 'Moderate — SAVR very high risk',
          'Decision': 'OAC trial vs TAVR-in-TAVR vs medical management',
        },
      },
    ],
    whyMissed: 'TAVR-in-TAVR is a relatively new concept requiring specialized CT planning (virtual THV-to-coronary distance, neo-commissural alignment). Many programs have not yet developed protocols for evaluating failing TAVR patients for redo transcatheter intervention.',
    whyTailrd: 'TAILRD identified patients with prior TAVR showing echocardiographic evidence of valve failure (rising gradients, new regurgitation) without dedicated CT planning for TAVR-in-TAVR feasibility.',
    methodologyNote: '[Source: Demo Health System / National Benchmark]. Patient count: estimated failing TAVR population × not assessed × 35% market share ≈ 12. Dollar opportunity: $72,000 TAVR × 12 × 30% conversion = $259.2K.',
  },
  // ============================================================
  // GAP sh-21: SEVERE AR — LVEF/LVESD THRESHOLD MONITORING NOT PERFORMED
  // ============================================================
  {
    id: 'sh-gap-21-severe-ar-surveillance',
    name: 'Severe Aortic Regurgitation — LVEF/LVESD Threshold Monitoring Not Performed',
    category: 'Gap',
    patientCount: 380,
    dollarOpportunity: 920000,
    priority: 'high',
    evidence:
      '2021 ACC/AHA Valvular Heart Disease Guidelines: severe AR with LVEF ≤55% or LVESD ≥50mm (or ≥25mm/m² BSA) is Class I surgical indication. Watchful waiting requires serial echo every 6-12 months + exercise testing if equivocal. Asymptomatic severe AR managed conservatively has 4.3%/year rate of crossing surgical threshold. Early surgical referral before LVEF <55% preserves long-term outcomes.',
    cta: 'Schedule Serial Echo — LVEF/LVESD Threshold Monitoring + CT Surgery Referral if Threshold Met',
    detectionCriteria: [
      'ICD-10 I35.1, I06.1, or Q23.1 with severe AR documented on echo',
      'No echocardiogram within 12 months',
      'LVEF ≤55% or LVESD ≥50mm documented without surgical referral',
      'No cardiothoracic surgery consultation in chart',
      'Exercise stress test not performed in asymptomatic severe AR patient >12 months',
    ],
    patients: [
      {
        id: 'SH-AR-021-001',
        name: 'Douglas Fairfield',
        mrn: 'MRN-SH-21001',
        age: 58,
        signals: [
          'Severe AR (I35.1) — LVEF 53% on last echo (below 55% threshold)',
          'LVESD 52mm — exceeds 50mm Class I surgical threshold',
          'Last echo 14 months ago — overdue per guideline interval',
          'No cardiothoracic surgery consultation documented',
          'Asymptomatic — but at surgical threshold by both LV size and function criteria',
        ],
        keyValues: {
          'Diagnosis': 'Severe nonrheumatic AR (I35.1)',
          'LVEF': '53% (threshold: ≤55%)',
          'LVESD': '52mm (threshold: ≥50mm)',
          'Last Echo': '14 months ago',
          'CT Surgery Consult': 'None on file',
          'Symptoms': 'Asymptomatic',
        },
      },
      {
        id: 'SH-AR-021-002',
        name: 'Patricia Holloway',
        mrn: 'MRN-SH-21002',
        age: 44,
        signals: [
          'Congenital AR (Q23.1) — severe on echo 16 months ago',
          'No follow-up echo scheduled despite Class I guideline interval',
          'LVEF 58% at last measurement — borderline, trend unknown',
          'Exercise testing not performed — symptoms equivocal',
          'Age 44: timing of surgery critical for LV function preservation',
        ],
        keyValues: {
          'Diagnosis': 'Congenital AR (Q23.1)',
          'LVEF': '58% (last measured 16 months ago)',
          'LVESD': '46mm (last measured 16 months ago)',
          'Last Echo': '16 months ago — overdue',
          'Exercise Test': 'Not performed',
          'Symptoms': 'Equivocal — mild exertional dyspnea',
        },
      },
      {
        id: 'SH-AR-021-003',
        name: 'Marcus Pendleton',
        mrn: 'MRN-SH-21003',
        age: 63,
        signals: [
          'Severe AR (I35.1) — managed in primary care without active cardiology follow-up',
          'LVESD 48mm trending up from 43mm 18 months ago',
          'No serial echo in 13 months — approaching 50mm LVESD threshold',
          'No heart team or CT surgery awareness of this patient',
          'Rate of LVESD progression: ~2.5mm per 6 months — will cross threshold in ~3 months',
        ],
        keyValues: {
          'Diagnosis': 'Severe AR (I35.1)',
          'LVEF': '57%',
          'LVESD': '48mm (prior 43mm — 18 months ago)',
          'Last Echo': '13 months ago',
          'CT Surgery Consult': 'None — managed in primary care',
          'Projected Threshold': '~3 months at current rate',
        },
      },
    ],
    whyMissed: 'Severe AR patients are often asymptomatic for years and managed in primary care or general cardiology without structural heart surveillance protocols. The LVEF/LVESD thresholds are precise numeric criteria that require serial echo tracking — which standard EHR workflows do not systematically monitor.',
    whyTailrd: 'TAILRD identifies severe AR patients by cross-referencing ICD-10 codes, echo reports for AR severity grading, serial LVEF/LVESD values, and cardiothoracic surgery consultation timestamps to flag patients approaching or exceeding Class I surgical thresholds without referral.',
    methodologyNote: 'Identifies patients with severe aortic regurgitation (I35.1 nonrheumatic AR, I06.1 rheumatic AR, Q23.1 congenital AR) who have not had echocardiographic LVEF and LVESD measurement within 12 months, or who have crossed surgical threshold criteria without cardiothoracic surgery referral. Flags patients managed in primary care without active cardiology follow-up.',
  },
  // ============================================================
  // GAP sh-22: SIGNIFICANT ASD — DEVICE CLOSURE EVALUATION NOT INITIATED
  // ============================================================
  {
    id: 'sh-gap-22-asd-closure',
    name: 'Significant ASD — Device Closure Evaluation Not Initiated',
    category: 'Gap',
    patientCount: 195,
    dollarOpportunity: 740000,
    priority: 'high',
    evidence:
      '2018 ACC/AHA ACHD Guidelines: secundum ASD with Qp:Qs >1.5 and RV dilation — transcatheter device closure (Amplatzer/Gore Cardioform) is Class I (LOE B). ASD closure reduces AF risk by 50%, reverses RV dilation, and prevents progressive pulmonary hypertension. Transcatheter closure preferred over surgery for secundum ASDs with adequate rim. If pulmonary vascular resistance >8 WU, closure contraindicated. CLOSE trial: PFO closure reduces stroke recurrence; ASD closure has similar benefit for paradoxical embolism.',
    cta: 'Structural Heart / ACHD Consultation — Transcatheter ASD Device Closure Evaluation',
    detectionCriteria: [
      'ICD-10 Q21.1 (atrial septal defect) in active problem list',
      'RV dilation or RVSP >40 mmHg documented on echocardiogram',
      'No structural heart or ACHD specialist consultation in past 24 months',
      'Transcatheter device closure not discussed or offered',
      'Exclude: Pulmonary vascular resistance >8 WU (documented closure contraindication)',
    ],
    patients: [
      {
        id: 'SH-ASD-022-001',
        name: 'Vivienne Cartwright',
        mrn: 'MRN-SH-22001',
        age: 41,
        signals: [
          'Secundum ASD (Q21.1) — RV dilation on echo (RVEDD 44mm)',
          'RVSP 48 mmHg — mild pulmonary hypertension',
          'No structural heart consultation — followed by general cardiologist',
          'Qp:Qs estimated 1.8 on bubble study — hemodynamically significant',
          'Age 41: ASD closure now before RV dysfunction becomes irreversible',
        ],
        keyValues: {
          'Diagnosis': 'Secundum ASD (Q21.1)',
          'ASD Size': '18mm on TEE',
          'RVEDD': '44mm (dilated)',
          'RVSP': '48 mmHg',
          'Qp:Qs': '1.8 (estimated)',
          'Structural Heart Consult': 'None',
        },
      },
      {
        id: 'SH-ASD-022-002',
        name: 'Gerald Whitmore',
        mrn: 'MRN-SH-22002',
        age: 55,
        signals: [
          'Known ASD (Q21.1) diagnosed 8 years ago — never referred for closure evaluation',
          'Recent echo: moderate RV dilation, RVSP 52 mmHg',
          'New paroxysmal AF — ASD closure reduces AF risk 50%',
          'No ACHD or structural heart specialist in care team',
          'Echo rim measurements not documented — transcatheter eligibility unknown',
        ],
        keyValues: {
          'Diagnosis': 'ASD (Q21.1) — known 8 years',
          'RV': 'Moderate dilation',
          'RVSP': '52 mmHg',
          'AF': 'New paroxysmal AF',
          'Structural Heart Consult': 'Never referred',
          'Device Eligibility': 'Not assessed',
        },
      },
      {
        id: 'SH-ASD-022-003',
        name: 'Constance Bellamy',
        mrn: 'MRN-SH-22003',
        age: 34,
        signals: [
          'Incidental ASD found on echo ordered for palpitations',
          'ASD 14mm — Qp:Qs 1.6, RV borderline dilated',
          'No follow-up plan documented — patient unaware of significance',
          'Age 34: early closure avoids lifetime RV volume overload and AF risk',
          'PVR not formally measured — needs right heart catheterization if PH suspected',
        ],
        keyValues: {
          'Diagnosis': 'Secundum ASD (Q21.1) — incidental finding',
          'ASD Size': '14mm',
          'Qp:Qs': '1.6',
          'RV': 'Borderline dilation',
          'PVR': 'Not formally assessed',
          'Follow-Up Plan': 'None documented',
        },
      },
    ],
    whyMissed: 'ASD in adults is often managed expectantly in general cardiology without ACHD or structural heart specialist referral, particularly when diagnosed incidentally. The hemodynamic significance criteria (Qp:Qs >1.5, RV dilation) require echo interpretation linked to device closure guidelines — a connection standard systems do not make automatically.',
    whyTailrd: 'TAILRD identifies adult ASD patients by combining ICD-10 Q21.1 with echo RV dilation findings, RVSP elevations, and absence of ACHD/structural heart consultation to flag candidates for transcatheter device closure evaluation.',
    methodologyNote: 'Identifies patients with ICD-10 Q21.1 (ASD) documented on echo with evidence of hemodynamic significance (RV dilation, elevated RVSP, Qp:Qs >1.5 on bubble study or Doppler estimate) who have not had structural heart consultation for device closure evaluation. Distinct from PFO closure gap (sh-gap-12) — ASD is larger and carries higher hemodynamic consequence.',
  },
  // ============================================================
  // GAP sh-23: PRIMARY (DEGENERATIVE) MR — SURGICAL REPAIR TIMING NOT MONITORED
  // ============================================================
  {
    id: 'sh-gap-23-primary-mr-surveillance',
    name: 'Primary (Degenerative) Mitral Regurgitation — Surgical Repair Timing Threshold Not Monitored',
    category: 'Gap',
    patientCount: 520,
    dollarOpportunity: 1350000,
    priority: 'high',
    evidence:
      '2021 ACC/AHA VHD Guidelines: severe primary MR + LVEF ≤60% or LVESD ≥40mm is Class I surgical indication. LVEF 60-65% + asymptomatic = Class IIa for repair at experienced center (repair rate >95%). Serial echo every 6-12 months for severe primary MR (MVP, flail leaflet). Mitral repair vs. replacement: repair durable 20+ years, preserves LV function. Early repair when repair likelihood >95% at high-volume center is Class IIa.',
    cta: 'Serial Echo — LVEF/LVESD Threshold Monitoring + CT Surgery Referral for Repair Timing',
    detectionCriteria: [
      'ICD-10 I34.0 or I34.1 with severe MR grading (vena contracta >7mm or ERO >0.4cm²) documented',
      'No echocardiogram within 12 months',
      'LVEF ≤60% or LVESD ≥40mm documented without surgical referral',
      'No CT surgery or structural heart consultation in chart',
      'Echo surveillance interval >12 months in patient with severe MR still on watchful waiting',
    ],
    patients: [
      {
        id: 'SH-PMR-023-001',
        name: 'Evelyn Ashworth',
        mrn: 'MRN-SH-23001',
        age: 62,
        signals: [
          'Severe primary MR (I34.1, MVP with flail posterior leaflet) — LVEF 58% (below 60% threshold)',
          'LVESD 42mm — exceeds 40mm Class I surgical threshold',
          'Last echo 15 months ago — surveillance interval exceeded',
          'No CT surgery consultation — still on watchful waiting',
          'Repair likelihood >95% at experienced center — Class IIa indication applies',
        ],
        keyValues: {
          'Diagnosis': 'MVP with severe MR, flail P2 leaflet (I34.1)',
          'LVEF': '58% (threshold: ≤60%)',
          'LVESD': '42mm (threshold: ≥40mm)',
          'ERO': '0.55 cm² (severe)',
          'Last Echo': '15 months ago',
          'CT Surgery Consult': 'None',
        },
      },
      {
        id: 'SH-PMR-023-002',
        name: 'Reginald Forsythe',
        mrn: 'MRN-SH-23002',
        age: 57,
        signals: [
          'Severe primary MR (I34.0) — degenerative, thickened posterior leaflet',
          'LVEF 62% — in the 60-65% early repair window (Class IIa)',
          'Echo 13 months ago — annual interval exceeded',
          'No discussion of early repair at experienced center',
          'Asymptomatic — early referral preserves LV function long-term',
        ],
        keyValues: {
          'Diagnosis': 'Nonrheumatic MR (I34.0) — degenerative',
          'LVEF': '62% (early repair window 60-65%)',
          'LVESD': '38mm',
          'Vena Contracta': '8mm (severe)',
          'Last Echo': '13 months ago',
          'CT Surgery Consult': 'None — asymptomatic watchful waiting',
        },
      },
      {
        id: 'SH-PMR-023-003',
        name: 'Lorraine Stanhope',
        mrn: 'MRN-SH-23003',
        age: 68,
        signals: [
          'Severe primary MR (I34.1 MVP) — followed in primary care for 2 years without structural heart input',
          'Last echo 18 months ago — LVEF 64%, LVESD 36mm at that time',
          'Current status unknown — patient reportedly more dyspneic on exertion',
          'No serial echo or CT surgery consultation in chart',
          'Risk of crossing LVEF ≤60% threshold without detection',
        ],
        keyValues: {
          'Diagnosis': 'MVP with severe MR (I34.1)',
          'LVEF': '64% (last measured 18 months ago)',
          'LVESD': '36mm (last measured 18 months ago)',
          'Last Echo': '18 months ago — overdue',
          'Current Symptoms': 'New exertional dyspnea reported',
          'CT Surgery Consult': 'Never',
        },
      },
    ],
    whyMissed: 'Primary MR surveillance requires precise serial echo tracking of LVEF and LVESD against guideline thresholds, combined with CT surgery referral logic. General cardiology practices often manage these patients with infrequent echo and no systematic threshold alerting, leading to delayed surgical referral after LV dysfunction is established.',
    whyTailrd: 'TAILRD identifies severe primary MR patients by combining ICD-10 codes, echo reports for MR severity grading and serial LVEF/LVESD values, and cardiothoracic surgery consultation timestamps to flag patients at or approaching Class I/IIa surgical thresholds without referral.',
    methodologyNote: 'Identifies patients with severe primary (degenerative) MR (I34.0 MR, I34.1 MVP with severe regurgitation) who have not had serial echocardiographic assessment within 12 months, or whose echo shows LVEF declining below 60% or LVESD ≥40mm without cardiothoracic surgery referral for repair timing discussion. Distinct from functional MR gaps (TEER/COAPT-based) — this is structural, leaflet-based MR.',
  },
  // ============================================================
  // GAP sh-24: HIGH CORONARY OBSTRUCTION RISK PRE-TAVR — BASILICA EVALUATION NOT DOCUMENTED
  // ============================================================
  {
    id: 'sh-gap-24-basilica-prep',
    name: 'High Coronary Obstruction Risk Pre-TAVR — BASILICA Technique Evaluation Not Documented',
    category: 'Safety',
    patientCount: 85,
    dollarOpportunity: 560000,
    priority: 'high',
    evidence:
      'BASILICA (Bioprosthetic or native Aortic Scallop Intentional Laceration to prevent Iatrogenic Coronary Artery obstruction): transcatheter technique to lacerate valve leaflets prior to TAVR/TMVR in patients at risk for coronary obstruction. Published outcomes (BASILICA IDE trial, JACC Intv 2020): 100% procedural success, coronary obstruction eliminated. Risk factors: coronary height <10-12mm, STJ diameter narrow relative to TAVR device, prior SAVR/TAVI leaflet calcification, bulky calcified leaflets. Without BASILICA, coronary obstruction is 40-70% fatal. Mandatory pre-TAVR CT assessment of coronary height.',
    cta: 'Mandatory Heart Team Review — BASILICA Technique Evaluation or Coronary Protection Strategy Documentation',
    detectionCriteria: [
      'Scheduled TAVR or redo-TAVR procedure with CT aorta on file',
      'CT measurement: left coronary height <12mm from annulus plane OR STJ-annulus ratio at risk',
      'No BASILICA technique evaluation or coronary protection strategy documented in heart team note',
      'Prior bioprosthetic SAVR with calcified leaflets (high TAVR-in-TAVR coronary obstruction risk)',
      'Chimney stenting strategy not documented as alternative if BASILICA not feasible',
    ],
    patients: [
      {
        id: 'SH-BSL-024-001',
        name: 'Charles Ridgeway',
        mrn: 'MRN-SH-24001',
        age: 79,
        signals: [
          'TAVR scheduled — CT shows left coronary ostium height 8mm from annulus plane (high risk)',
          'STJ diameter 24mm with bulky calcified native leaflets',
          'No BASILICA evaluation documented in heart team notes',
          'Coronary obstruction without protection: 40-70% fatal',
          'BASILICA IDE trial: 100% success rate when technique applied proactively',
        ],
        keyValues: {
          'Procedure': 'TAVR (scheduled)',
          'LCA Height': '8mm (high risk threshold: <12mm)',
          'STJ Diameter': '24mm',
          'Leaflet': 'Bulky calcified native leaflets',
          'BASILICA Review': 'Not documented',
          'Coronary Risk': 'High — obstruction risk without protection',
        },
      },
      {
        id: 'SH-BSL-024-002',
        name: 'Marguerite Dalton',
        mrn: 'MRN-SH-24002',
        age: 82,
        signals: [
          'TAVR-in-TAVR planned — prior SAVR (Carpentier-Edwards 21mm) with calcified leaflets',
          'CT: LCA height 10mm, RCA height 9mm — both below 12mm threshold',
          'No BASILICA technique discussion or chimney stent strategy in chart',
          'Prior SAVR leaflet calcification dramatically increases coronary obstruction risk',
          'Heart team meeting notes do not address coronary protection',
        ],
        keyValues: {
          'Procedure': 'TAVR-in-TAVR (planned)',
          'Prior SAVR': 'Carpentier-Edwards 21mm',
          'LCA Height': '10mm (threshold: <12mm)',
          'RCA Height': '9mm (threshold: <12mm)',
          'BASILICA Review': 'Not in heart team notes',
          'Chimney Strategy': 'Not documented',
        },
      },
      {
        id: 'SH-BSL-024-003',
        name: 'Thaddeus Norbert',
        mrn: 'MRN-SH-24003',
        age: 76,
        signals: [
          'TMVR (transcatheter mitral valve replacement) candidate — native mitral with bulky leaflets',
          'Aorto-mitral curtain angle: risk of left ventricular outflow tract obstruction and coronary impingement',
          'No BASILICA-TMVR or mechanical circulatory support strategy documented',
          'CT aorta performed but no coronary height measurement noted in planning document',
          'Heart team has not formally addressed neo-LVOT obstruction risk',
        ],
        keyValues: {
          'Procedure': 'TMVR (transcatheter mitral replacement)',
          'Mitral Anatomy': 'Bulky anterior leaflet, calcified annulus',
          'LVOT Risk': 'Aorto-mitral angle — neo-LVOT obstruction risk',
          'CT Status': 'Performed — coronary height not formally measured',
          'BASILICA Review': 'Not documented',
          'Heart Team Note': 'Does not address BASILICA or coronary protection',
        },
      },
    ],
    whyMissed: 'BASILICA is a specialized technique known primarily to high-volume TAVR centers. Pre-procedural CT coronary height measurement is not universally standardized into TAVR planning checklists, and lower-volume centers may not have BASILICA capability or awareness of when to refer for the technique.',
    whyTailrd: 'TAILRD flags TAVR-scheduled patients by analyzing pre-procedural CT measurements for coronary ostium height and STJ-to-annulus ratios, then cross-references against heart team meeting documentation to identify cases where coronary protection strategy is absent.',
    methodologyNote: 'Identifies patients scheduled for TAVR or TAVR-in-TAVR/TMVR who have coronary obstruction risk factors on preprocedural CT (coronary ostium height <10mm from annulus, STJ diameter <27mm with bulky leaflets, valve-to-coronary distance assessment pending) without documented BASILICA technique discussion or coronary protection strategy in the heart team meeting notes.',
  },
];

// ============================================================
// ENHANCED DISPLAY HELPERS
// ============================================================

/** Gap 3 + Gap 79: AS Severity display from echocardiographic data */
const renderASSeverityDisplay = (pt: SHGapPatient) => {
  const vmaxRaw = pt.keyValues['Vmax'] || pt.keyValues['Vmax (Last Echo)'] || '';
  const meanGradRaw = pt.keyValues['Mean Gradient'] || '';
  const avaRaw = pt.keyValues['AVA'] || '';

  const vmaxNum = parseFloat(String(vmaxRaw));
  const meanGradNum = parseFloat(String(meanGradRaw));
  const avaNum = parseFloat(String(avaRaw));

  const asResult = classifyASSeverity({
    vmaxAortic: isNaN(vmaxNum) ? undefined : vmaxNum,
    meanGradientAortic: isNaN(meanGradNum) ? undefined : meanGradNum,
    avaAortic: isNaN(avaNum) ? undefined : avaNum,
  });

  return (
    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl p-3 space-y-2">
      <div className="text-sm font-semibold text-blue-900">
        AS Severity: {asResult.severity} &mdash; Vmax {asResult.parameters['Vmax'] || String(vmaxRaw)} &middot; Gradient {asResult.parameters['Mean gradient'] || String(meanGradRaw)} &middot; AVA {asResult.parameters['AVA'] || String(avaRaw)}
      </div>
      {asResult.meetsCriteria.length > 0 && (
        <div className="text-xs text-blue-700">Criteria met: {asResult.meetsCriteria.join(', ')}</div>
      )}
      <div className="flex items-center gap-1.5 text-xs text-blue-600">
        <Zap className="w-3 h-3 flex-shrink-0" />
        Auto-classified from echocardiographic data
      </div>
    </div>
  );
};

/** Gap 5: COAPT Eligibility checker */
const renderCOAPTEligibility = (pt: SHGapPatient) => {
  const parsePctNum = (val: string | number | undefined): number => {
    if (val === undefined) return NaN;
    const s = String(val).replace('%', '').replace('mm', '').replace('cm2', '').trim();
    return parseFloat(s);
  };

  const lvef = parsePctNum(pt.keyValues['LVEF']);
  const lvesd = parsePctNum(pt.keyValues['LVESD']);
  const eroa = parsePctNum(pt.keyValues['EROA']);

  const gdmtStatus = String(pt.keyValues['GDMT Status'] || pt.keyValues['Missing GDMT'] || '').toLowerCase();
  const gdmtOptimized = gdmtStatus.includes('fully optimized') || gdmtStatus === 'none';
  const signals_lower = pt.signals.map(s => s.toLowerCase()).join(' ');
  const gdmtFromSignals = signals_lower.includes('optimized gdmt') || signals_lower.includes('all 4 pillars');

  const lvefMet = !isNaN(lvef) && lvef >= 20 && lvef <= 50;
  const lvesdMet = !isNaN(lvesd) && lvesd <= 70;
  const eroaMet = !isNaN(eroa) && eroa >= 0.3;
  const gdmtMet = gdmtOptimized || gdmtFromSignals;

  const checkIcon = (met: boolean) => met
    ? <CheckCircle className="w-3.5 h-3.5 text-teal-700 flex-shrink-0" />
    : <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />;

  return (
    <div className="mt-3 bg-green-50 border border-green-100 rounded-xl p-3 space-y-2">
      <div className="text-xs font-semibold text-teal-700 uppercase tracking-wide mb-1">COAPT Eligibility Criteria</div>
      <div className="space-y-1">
        <div className="flex items-center gap-2 text-sm">
          {checkIcon(lvefMet)}
          <span className={lvefMet ? 'text-teal-700' : 'text-red-700'}>LVEF 20-50%: {!isNaN(lvef) ? `${lvef}%` : 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {checkIcon(lvesdMet)}
          <span className={lvesdMet ? 'text-teal-700' : 'text-red-700'}>LVESD &le;70mm: {!isNaN(lvesd) ? `${lvesd}mm` : 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {checkIcon(eroaMet)}
          <span className={eroaMet ? 'text-teal-700' : 'text-red-700'}>EROA &ge;0.3cm&sup2;: {!isNaN(eroa) ? `${eroa} cm2` : 'N/A'}</span>
        </div>
        <div className="flex items-center gap-2 text-sm">
          {checkIcon(gdmtMet)}
          <span className={gdmtMet ? 'text-teal-700' : 'text-red-700'}>GDMT optimized: {gdmtMet ? 'Yes' : 'No — optimize first'}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
        <Zap className="w-3 h-3 flex-shrink-0" />
        Auto-assessed from echo measurements and medication records
      </div>
    </div>
  );
};

/** Gap 42: ATTR-CM + AS co-detection (dual detection) */
const renderATTRCoDetection = (pt: SHGapPatient) => {
  const vmax = pt.keyValues['Vmax'] || '';
  const meanGrad = pt.keyValues['Mean Gradient'] || '';
  const ava = pt.keyValues['AVA'] || '';
  const attrSignals = pt.signals.filter(s => s.toLowerCase().includes('attr'));
  return (
    <div className="mt-3 bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
      <div className="text-xs font-semibold text-slate-800 uppercase tracking-wide mb-1">Dual Detection: Severe AS + ATTR-CM</div>
      <div className="text-sm text-slate-900 font-medium">
        Severe AS confirmed: Vmax {vmax} · Mean gradient {meanGrad} · AVA {ava}
      </div>
      <div className="text-sm text-slate-900 font-medium">
        AND ATTR-CM signals present: {attrSignals.length > 0 ? attrSignals.join('; ') : pt.signals.join('; ')}
      </div>
      <div className="flex items-center gap-1.5 text-xs text-slate-600 mt-1">
        <Zap className="w-3 h-3 flex-shrink-0" />
        Cross-module dual detection — unique to TAILRD
      </div>
    </div>
  );
};

/** Gap 81: Rheumatic MS on DOAC — RED safety alert */
const renderRheumaticMSSafetyAlert = (pt: SHGapPatient) => {
  const currentAC = String(pt.keyValues['Current AC'] || '');
  return (
    <div className="mt-3 bg-red-50 border-2 border-red-200 rounded-xl p-3 space-y-2">
      <div className="flex items-center gap-2 text-sm font-bold text-red-800">
        <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
        INVICTUS 2022: DOACs inferior to warfarin in rheumatic valve disease
      </div>
      <div className="text-sm text-red-700">
        Current anticoagulant: <span className="font-semibold">{currentAC}</span>
      </div>
      <div className="text-sm font-semibold text-red-800">
        Switch to warfarin — target INR 2.0-3.0
      </div>
      <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
        <Zap className="w-3 h-3 flex-shrink-0" />
        Auto-detected from diagnosis and medication data
      </div>
    </div>
  );
};

// ---------------------------------------------------------------------------
// PREDICTIVE INTELLIGENCE — Trajectory + Time Horizon + Projected Events
// ---------------------------------------------------------------------------

const getSHTrajectoryBadges = (gap: SHClinicalGap, pt: SHGapPatient) => {
  const kv = pt.keyValues;
  let trajectory: TrajectoryResult | null = null;

  // For AS patients: increasing Vmax = worsening, so negate for computeTrajectory (which treats declining as worsening)
  const currentVmaxRaw = typeof kv['Vmax'] === 'number' ? kv['Vmax'] : parseFloat(String(kv['Vmax'] || ''));
  const priorVmaxRaw = typeof kv['Prior Vmax'] === 'number' ? kv['Prior Vmax'] : parseFloat(String(kv['Prior Vmax'] || ''));
  const currentRoot = typeof kv['Aortic Root'] === 'number' ? kv['Aortic Root'] : parseFloat(String(kv['Aortic Root'] || ''));
  const priorRoot = typeof kv['Prior Aortic Root'] === 'number' ? kv['Prior Aortic Root'] : parseFloat(String(kv['Prior Aortic Root'] || ''));

  if (!isNaN(currentVmaxRaw) && !isNaN(priorVmaxRaw) && priorVmaxRaw > 0) {
    // Negate: increasing Vmax is worsening, but computeTrajectory treats declining as worsening
    trajectory = computeTrajectory({ currentValue: -currentVmaxRaw, priorValue: -priorVmaxRaw, daysBetween: 180 });
  } else if (!isNaN(currentRoot) && !isNaN(priorRoot) && priorRoot > 0) {
    // Increasing root = worsening, so negate
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
        trajectory.direction === 'worsening_slow' ? 'bg-amber-50 text-amber-600' :
        trajectory.direction === 'improving' ? 'bg-green-50 text-green-600' :
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

const renderSHPredictiveDetail = (gap: SHClinicalGap, pt: SHGapPatient) => {
  const gapId = gap.id.toLowerCase();
  const kv = pt.keyValues;
  const elements: React.ReactNode[] = [];

  // Gap 3 (Severe AS) and Gap 79 (Moderate AS) — AS Progression projection
  if (gapId.includes('severe-as') || gapId.includes('gap-3') || gapId.includes('moderate-as') || gapId.includes('gap-79')) {
    const currentVmax = typeof kv['Vmax'] === 'number' ? kv['Vmax'] : parseFloat(String(kv['Vmax'] || ''));
    const priorVmax = typeof kv['Prior Vmax'] === 'number' ? kv['Prior Vmax'] : undefined;
    if (!isNaN(currentVmax)) {
      const prog = projectASProgression({ currentVmax, priorVmax: priorVmax, monthsBetween: priorVmax != null ? 6 : undefined });
      if (gapId.includes('gap-3') || gapId.includes('severe-as')) {
        elements.push(
          <div key="as-prog" className="mt-3 bg-chrome-50 border border-titanium-300 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-chrome-800">
              <TrendingUp className="w-4 h-4 text-teal-700 flex-shrink-0" />
              Predictive Intelligence — AS Progression
            </div>
            <div className="text-sm text-teal-700">
              Already at severe threshold — intervention window active.
              {priorVmax != null && (
                <> Current Vmax: {currentVmax.toFixed(1)} m/s · Previous: {priorVmax.toFixed(1)} m/s (6 months ago) · Rate: {prog.annualizedRate.toFixed(2)} m/s/year ({prog.progressionCategory})</>
              )}
            </div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
              <Zap className="w-3 h-3 flex-shrink-0" />
              Trajectory-aware · Forward-looking · Auto-computed from serial echocardiography
            </div>
          </div>
        );
      } else {
        // Gap 79 — when will moderate become severe?
        elements.push(
          <div key="as-prog" className="mt-3 bg-chrome-50 border border-titanium-300 rounded-xl p-3 space-y-1">
            <div className="flex items-center gap-2 text-sm font-bold text-chrome-800">
              <TrendingUp className="w-4 h-4 text-teal-700 flex-shrink-0" />
              Predictive Intelligence — AS Progression to Severe
            </div>
            <div className="text-sm text-teal-700">
              Current Vmax: {currentVmax.toFixed(1)} m/s
              {priorVmax != null && <> · Previous: {priorVmax.toFixed(1)} m/s (6 months ago)</>}
              {' '}· Rate: {prog.annualizedRate.toFixed(2)} m/s/year ({prog.progressionCategory})
              {prog.monthsToSevere != null && prog.monthsToSevere > 0 && (
                <> · Predicted severe threshold (4.0 m/s): ~{prog.monthsToSevere} months ({prog.predictedSevereDate})</>
              )}
              {prog.monthsToSevere === 0 && <> · Already at severe threshold</>}
            </div>
            <div className="text-xs text-teal-700 italic">Confidence: {prog.confidence} — {prog.basisNote}</div>
            <div className="flex items-center gap-1.5 text-xs text-blue-600 mt-1">
              <Zap className="w-3 h-3 flex-shrink-0" />
              Trajectory-aware · Forward-looking · Auto-computed from serial echocardiography
            </div>
          </div>
        );
      }
    }
  }

  // Gap 82 (BAV Aortopathy) — Aortic Root growth projection via projectBAVProgression
  if (gapId.includes('bav') || gapId.includes('gap-82') || gapId.includes('aortopathy')) {
    const rootCurrent = typeof kv['Aortic Root'] === 'number' ? kv['Aortic Root'] : parseFloat(String(kv['Aortic Root'] || '0'));
    const rootPrior = typeof kv['Prior Aortic Root'] === 'number' ? kv['Prior Aortic Root'] : parseFloat(String(kv['Prior Aortic Root'] || '0'));
    // Compute months between from dates if available, else use 9
    let bavMonths = 9;
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
const renderSHEnhancedDisplay = (gap: SHClinicalGap, pt: SHGapPatient) => {
  const gapId = gap.id.toLowerCase();

  // Gap 3: Severe AS
  if (gapId.includes('severe-as') || gapId.includes('gap-3')) {
    return renderASSeverityDisplay(pt);
  }

  // Gap 5: COAPT / Functional MR
  if (gapId.includes('functional-mr') || gapId.includes('coapt') || gapId.includes('gap-5')) {
    return renderCOAPTEligibility(pt);
  }

  // Gap 42: ATTR-CM + AS co-detection
  if ((gapId.includes('attr') && gapId.includes('as')) || gapId.includes('co-detection')) {
    return renderATTRCoDetection(pt);
  }

  // Gap 79: Moderate AS surveillance — reuse AS severity classifier
  if (gapId.includes('moderate-as') || gapId.includes('gap-79')) {
    return renderASSeverityDisplay(pt);
  }

  // Gap 81: Rheumatic MS on DOAC
  if (gapId.includes('rheumatic') || gapId.includes('gap-81')) {
    return renderRheumaticMSSafetyAlert(pt);
  }

  return null;
};

// ============================================================
// GAP-LEVEL TRAJECTORY DATA
// ============================================================
const getSHGapTrajectoryData = (_gapId: string, patientCount: number, category: string): TrajectoryDistribution => {
  const isSafety = category === 'Safety';
  const isGrowth = category === 'Growth';
  if (isSafety) {
    return { worseningRapid: Math.round(patientCount * 0.31), worseningSlow: Math.round(patientCount * 0.34), stable: Math.round(patientCount * 0.23), improving: Math.round(patientCount * 0.12), total: patientCount };
  }
  if (isGrowth) {
    return { worseningRapid: Math.round(patientCount * 0.10), worseningSlow: Math.round(patientCount * 0.15), stable: Math.round(patientCount * 0.44), improving: Math.round(patientCount * 0.31), total: patientCount };
  }
  return { worseningRapid: Math.round(patientCount * 0.17), worseningSlow: Math.round(patientCount * 0.28), stable: Math.round(patientCount * 0.36), improving: Math.round(patientCount * 0.19), total: patientCount };
};

// ============================================================
// COMPONENT
// ============================================================
interface SHCategoryFilter {
  label: string;
  keywords: string[];
}

interface SHClinicalGapDetectionDashboardProps {
  categoryFilter?: SHCategoryFilter;
}

const SHClinicalGapDetectionDashboard: React.FC<SHClinicalGapDetectionDashboardProps> = ({ categoryFilter }) => {
  const [expandedGap, setExpandedGap] = useState<string | null>(null);
  const { trackGapView, gapActions } = useGapActions('STRUCTURAL_HEART');
  const [expandedPatient, setExpandedPatient] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'priority' | 'patients' | 'opportunity'>('priority');
  const [showMethodology, setShowMethodology] = useState<string | null>(null);
  const [activeFilters, setActiveFilters] = useState<string[]>([]);

  const totalPatients = SH_CLINICAL_GAPS.reduce((sum, g) => sum + g.patientCount, 0);
  const totalOpportunity = SH_CLINICAL_GAPS.reduce((sum, g) => sum + g.dollarOpportunity, 0);

  const priorityOrder: Record<string, number> = { high: 0, medium: 1, low: 2 };
  const categoryOrder: Record<string, number> = { Safety: 0, Discovery: 1, Gap: 2, Growth: 3, Quality: 2 };
  const sortedGaps = [...SH_CLINICAL_GAPS].sort((a, b) => {
    const catDiff = (categoryOrder[a.category] ?? 3) - (categoryOrder[b.category] ?? 3);
    if (catDiff !== 0) return catDiff;
    switch (sortBy) {
      case 'patients': return b.patientCount - a.patientCount;
      case 'opportunity': return b.dollarOpportunity - a.dollarOpportunity;
      default: return (priorityOrder[a.priority] ?? 2) - (priorityOrder[b.priority] ?? 2);
    }
  });

  const filterConfig: Record<string, string[]> = {
    'TAVR Pathway': ['TAVR', 'Severe AS', 'Aortic Stenosis', 'Low-Flow', 'Low-Gradient', 'Dobutamine', 'CT Sizing', 'Cerebral Embolic', 'BASILICA', 'TAVR-in-TAVR', 'Asymptomatic'],
    'Mitral & Tricuspid': ['Mitral', 'TEER', 'MR', 'TR', 'Tricuspid', 'COAPT', 'MITRA-FR', 'BMC', 'Commissurotomy', 'Primary MR', 'Functional MR'],
    'Structural Defect & HCM': ['PFO', 'ASD', 'HCM', 'Septal', 'Alcohol Septal', 'Obstructive HCM', 'Device Closure'],
    'Aortopathy': ['BAV', 'Aortopathy', 'Aortic Regurgitation', 'LVESD', 'Aortic Imaging', 'Root'],
    'Post-Procedure Quality': ['Post-TAVR', 'Paravalvular', 'Anticoagulation', 'Sizing Protocol', 'Peri-Procedural', 'Concomitant PCI', 'Endocarditis'],
    'Surveillance': ['Surveillance', 'Overdue', 'Monitoring', 'Echo', 'Imaging', 'Follow-Up'],
  };

  const chipCounts = Object.fromEntries(
    Object.entries(filterConfig).map(([label, keywords]) => [
      label,
      sortedGaps.filter(gap =>
        keywords.some(kw => (gap.name || '').toLowerCase().includes(kw.toLowerCase()))
      ).length
    ])
  );

  const filteredGaps = categoryFilter
    ? sortedGaps.filter(gap => {
        const gapName = (gap.name || '').toLowerCase();
        return categoryFilter.keywords.some(kw => gapName.includes(kw.toLowerCase()));
      })
    : activeFilters.length === 0 ? sortedGaps : sortedGaps.filter(gap => {
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
    if (p === 'medium') return 'bg-chrome-50 border-titanium-300 text-gray-500';
    return 'bg-green-50 border-green-100 text-teal-700';
  };

  const categoryColor = (c: string) =>
    c === 'Discovery'
      ? 'bg-chrome-50 text-chrome-800'
      : c === 'Gap'
      ? 'bg-red-100 text-red-800'
      : c === 'Safety'
      ? 'bg-rose-200 text-rose-900'
      : c === 'Quality'
      ? 'bg-amber-50 text-amber-600'
      : 'bg-blue-100 text-blue-800';

  const subflagColor = (sf?: string) => {
    if (!sf) return '';
    if (sf.includes('5a')) return 'bg-amber-50 text-amber-600';
    if (sf.includes('5b')) return 'bg-blue-100 text-blue-700';
    return 'bg-titanium-100 text-titanium-700';
  };

  return (
    <div className="space-y-6">
      {/* Header summary */}
      <div className="metal-card bg-white border border-titanium-200 rounded-2xl p-6">
        <h3 className="text-lg font-semibold text-titanium-900 mb-1 flex items-center gap-2">
          <Heart className="w-5 h-5 text-medical-red-600" />
          {categoryFilter
            ? `${categoryFilter.label} · ${filteredGaps.length} GAPS · ${filteredPatientCount.toLocaleString()} PATIENTS · $${(filteredOpportunity / 1_000_000).toFixed(1)}M OPPORTUNITY`
            : 'Clinical Gap Detection — Structural Heart Module'}
        </h3>
        {!categoryFilter && (
          <p className="text-sm text-titanium-600 mb-4">
            AI-driven detection of evidence-based structural heart therapy gaps and growth opportunities.
          </p>
        )}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <Users className="w-4 h-4 text-red-600" />
              <span className="text-xs font-semibold text-red-700 uppercase tracking-wide">Affected Patients</span>
            </div>
            <div className="text-2xl font-bold text-red-800">{categoryFilter ? filteredPatientCount.toLocaleString() : totalPatients.toLocaleString()}</div>
          </div>
          <div className="bg-green-50 border border-green-100 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <DollarSign className="w-4 h-4 text-teal-700" />
              <span className="text-xs font-semibold text-teal-700 uppercase tracking-wide">Total Opportunity</span>
            </div>
            <div className="text-2xl font-bold text-teal-700">
              ${((categoryFilter ? filteredOpportunity : totalOpportunity) / 1000000).toFixed(1)}M
            </div>
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span className="text-xs font-semibold text-blue-700 uppercase tracking-wide">Active Gaps</span>
            </div>
            <div className="text-2xl font-bold text-blue-800">{categoryFilter ? filteredGaps.length : SH_CLINICAL_GAPS.length}</div>
          </div>
        </div>
      </div>

      {/* Sort control — only shown in standalone mode */}
      {!categoryFilter && (
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
      )}

      {/* Filter Chips — only shown in standalone mode (no categoryFilter) */}
      {!categoryFilter && (
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
                    {gap.tag && (
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-700">
                        {gap.tag}
                      </span>
                    )}
                  </div>
                  {gap.category === 'Discovery' && (
                    <div className="flex items-center gap-1.5 mt-1">
                      <span className="text-xs font-semibold text-teal-700">{'\u2B21'} Discovery — Net new patients · Never previously identified</span>
                    </div>
                  )}
                  <div className="font-semibold text-titanium-900 text-base">{gap.name}</div>
                  {gap.whyMissed && (
                    <div className="mt-2 text-xs text-titanium-500 italic flex items-start gap-1.5">
                      <Search className="w-3 h-3 text-teal-500 flex-shrink-0 mt-0.5" />
                      <span>Why standard systems miss this: {gap.whyMissed}</span>
                    </div>
                  )}
                  <div className="flex gap-6 mt-2">
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-titanium-900">{gap.patientCount}</span> patients
                    </span>
                    <span className="text-sm text-titanium-600">
                      <span className="font-semibold text-teal-700">${(gap.dollarOpportunity / 1000000).toFixed(1)}M</span> opportunity
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
                    const dist = getSHGapTrajectoryData(gap.id, gap.patientCount, gap.category);
                    const q1Rev = Math.round(gap.dollarOpportunity * (dist.worseningRapid / Math.max(dist.total, 1)));
                    return (
                      <div className="px-4 py-3 bg-gradient-to-r from-titanium-50/80 to-white border border-titanium-100 rounded-xl">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-xs font-semibold text-titanium-600 uppercase tracking-wide">Patient Trajectory</span>
                          <span className="text-xs bg-slate-50 text-slate-600 px-1.5 py-0.5 rounded font-medium">Forward-looking</span>
                        </div>
                        <div className="flex items-center gap-4 text-xs">
                          <span className="text-red-600 font-medium">{'\u2193'} {dist.worseningRapid} worsening rapidly</span>
                          <span className="text-gray-500 font-medium">{'\u2198'} {dist.worseningSlow} worsening slowly</span>
                          <span className="text-gray-500 font-medium">{'\u2192'} {dist.stable} stable</span>
                          <span className="text-teal-700 font-medium">{'\u2197'} {dist.improving} improving</span>
                        </div>
                        <div className="flex h-2 rounded-full overflow-hidden mt-2">
                          <div className="bg-red-400" style={{ width: `${(dist.worseningRapid / dist.total) * 100}%` }} />
                          <div className="bg-chrome-50" style={{ width: `${(dist.worseningSlow / dist.total) * 100}%` }} />
                          <div className="bg-gray-300" style={{ width: `${(dist.stable / dist.total) * 100}%` }} />
                          <div className="bg-titanium-300" style={{ width: `${(dist.improving / dist.total) * 100}%` }} />
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-titanium-600">
                          <span>Q1 opportunity: <span className="font-bold text-teal-700">{formatDollar(q1Rev)}</span> ({dist.worseningRapid} patients -- highest urgency)</span>
                          <span>Full population: <span className="font-bold text-teal-700">{formatDollar(gap.dollarOpportunity)}</span></span>
                        </div>
                      </div>
                    );
                  })()}

                  <div>
                    <h4 className="font-semibold text-titanium-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-gray-500" />
                      Detection Criteria
                    </h4>
                    <ul className="space-y-1">
                      {gap.detectionCriteria.map((c) => (
                        <li key={c} className="text-sm text-titanium-700 flex gap-2">
                          <CheckCircle className="w-3.5 h-3.5 text-teal-700 flex-shrink-0 mt-0.5" />
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

                  {/* Gap Action Buttons — care team response tracking */}
                  <GapActionButtons
                    gapId={gap.id}
                    gapName={gap.name}
                    ctaText={gap.cta}
                    moduleType="STRUCTURAL_HEART"
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
                                {pt.subflag && (
                                  <span className={`ml-2 text-xs px-2 py-0.5 rounded-full ${subflagColor(pt.subflag)}`}>
                                    {pt.subflag}
                                  </span>
                                )}
                                {gap.ctaMap && pt.subflag && gap.ctaMap[pt.subflag] && (
                                  <span className="ml-2 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full">
                                    {gap.ctaMap[pt.subflag]}
                                  </span>
                                )}
                                {gap.category === 'Discovery' && (
                                  <span className="ml-2 inline-flex items-center gap-1 text-xs bg-green-50 text-green-600 px-2 py-0.5 rounded-full" title="This patient was not previously flagged in any clinical workflow. TAILRD identified this patient by assembling disconnected signals across care settings.">
                                    <Radio className="w-3 h-3" />
                                    First identified by TAILRD
                                  </span>
                                )}
                                {getSHTrajectoryBadges(gap, pt)}
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
                            {ptOpen && renderSHEnhancedDisplay(gap, pt) && (
                              <div className="px-4">
                                {renderSHEnhancedDisplay(gap, pt)}
                              </div>
                            )}
                            {ptOpen && renderSHPredictiveDetail(gap, pt) && (
                              <div className="px-4">
                                {renderSHPredictiveDetail(gap, pt)}
                              </div>
                            )}
                            {ptOpen && gap.whyTailrd && (
                              <div className="px-4">
                                <div className="bg-chrome-50 border border-titanium-300 rounded-xl p-3 mt-2">
                                  <p className="text-xs font-semibold text-teal-700 mb-1">Why TAILRD identified this patient:</p>
                                  <p className="text-sm text-teal-700">{gap.whyTailrd}</p>
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

export default SHClinicalGapDetectionDashboard;
