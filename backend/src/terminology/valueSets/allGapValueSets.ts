/**
 * TAILRD Platform — Gap ValueSet Definitions
 *
 * Defines a GapValueSet for each of the 104 TAILRD clinical gaps.
 * Priority gaps (14) have COMPLETE code sets. Remaining gaps have
 * skeleton definitions with at minimum gapId, gapName, module, and
 * relevant diagnosisCodes.
 */

import { GapValueSet } from '../types';

// ============================================================================
// COMPLETE VALUE SETS — 14 Priority Gaps
// ============================================================================

/** Gap 1 — ATTR Cardiac Amyloidosis Screening (HF) */
const GAP_001: GapValueSet = {
  gapId: 'GAP-001',
  gapName: 'ATTR-CM Screening',
  module: 'HF',
  diagnosisCodes: [
    'I50.x', 'I42.5', 'I42.8', 'I42.9',
    'E85.1', 'E85.4', 'E85.82', 'E85.89',
  ],
  exclusionCodes: ['E85.81'], // AL amyloid excluded (different treatment pathway)
  procedureCodes: ['78816', '93306'], // Tc-99m PYP scan, TTE
  medicationCodes: ['2169274', '2384786', '2181053'], // tafamidis, vutrisiran, patisiran
  labCodes: ['33762-6', '67151-1', '18010-0'], // NT-proBNP, hs-TnT, LVEF
  labThresholds: [
    { loincCode: '33762-6', operator: '>=', value: 300, unit: 'pg/mL' },
    { loincCode: '18010-0', operator: '>=', value: 40, unit: '%' },
  ],
  deviceCodes: [],
  methodologyNote: 'Red flags: HFpEF + LVH + low-voltage ECG + age > 65 + bilateral carpal tunnel. Tc-99m PYP Grade 2-3 = ATTR-CM. Exclude AL amyloid via serum/urine immunofixation.',
};

/** Gap 2 — Iron Deficiency in HF (HF) */
const GAP_002: GapValueSet = {
  gapId: 'GAP-002',
  gapName: 'Iron Deficiency in Heart Failure',
  module: 'HF',
  diagnosisCodes: ['I50.x', 'D50.9', 'D63.1'],
  exclusionCodes: [],
  procedureCodes: [],
  medicationCodes: ['1313988', '1745880', '7612'], // FCM, ferric derisomaltose, iron sucrose
  labCodes: ['14647-2', '2502-3', '718-7', '18010-0'],
  labThresholds: [
    { loincCode: '14647-2', operator: '<', value: 100, unit: 'ng/mL' },
    { loincCode: '2502-3', operator: '<', value: 20, unit: '%' },
    { loincCode: '18010-0', operator: '<', value: 50, unit: '%' },
  ],
  deviceCodes: [],
  methodologyNote: 'Iron deficiency: ferritin < 100 ng/mL OR ferritin 100-299 with TSAT < 20%. FAIR-HF/AFFIRM-AHF criteria. IV iron indicated in HFrEF with iron deficiency.',
};

/** Gap 3 — Asymptomatic Severe Aortic Stenosis (SH) */
const GAP_003: GapValueSet = {
  gapId: 'GAP-003',
  gapName: 'Asymptomatic Severe Aortic Stenosis',
  module: 'SH',
  diagnosisCodes: ['I35.0', 'I35.2', 'Q23.0', 'Q23.1'],
  exclusionCodes: [],
  procedureCodes: ['33361', '33362', '33363', '33364', '33365', '33366', '93306', '93350'],
  medicationCodes: [],
  labCodes: ['18010-0', '18148-8', '77912-1', '33762-6'],
  labThresholds: [
    { loincCode: '18148-8', operator: '>=', value: 40, unit: 'mmHg' },
    { loincCode: '77912-1', operator: '<=', value: 1.0, unit: 'cm2' },
    { loincCode: '18010-0', operator: '<', value: 55, unit: '%' },
  ],
  deviceCodes: [],
  methodologyNote: 'Severe AS: AVA <= 1.0 cm2 OR mean gradient >= 40 mmHg OR Vmax >= 4.0 m/s. EVOLVED/EARLY TAVR data support early intervention when LVEF < 60% or rapid progression.',
};

/** Gap 4 — Left Atrial Appendage Closure (EP) */
const GAP_004: GapValueSet = {
  gapId: 'GAP-004',
  gapName: 'Left Atrial Appendage Closure (LAAC)',
  module: 'EP',
  diagnosisCodes: ['I48.0', 'I48.1', 'I48.11', 'I48.19', 'I48.20', 'I48.21', 'I48.91'],
  exclusionCodes: [],
  procedureCodes: ['33340', '93312'], // LAAC, TEE
  medicationCodes: [
    '1114195', '1364430', '1037045', '1599538', // DOACs
    '11289', // warfarin
  ],
  labCodes: ['6301-6'], // INR
  labThresholds: [],
  deviceCodes: ['WATCHMAN', 'AMULET'],
  methodologyNote: 'LAAC indicated for AF patients with CHA2DS2-VASc >= 2 who are unsuitable for long-term OAC. CHAMPION-AF data support expanded indications.',
};

/** Gap 6 — Finerenone in CKD + T2DM + HF (HF) */
const GAP_006: GapValueSet = {
  gapId: 'GAP-006',
  gapName: 'Finerenone for CKD with T2DM',
  module: 'HF',
  diagnosisCodes: [
    'I50.x',
    'E11.9', 'E11.65', 'E11.22',
    'N18.3', 'N18.4',
  ],
  exclusionCodes: ['N18.5', 'N18.6'], // ESRD excluded
  procedureCodes: [],
  medicationCodes: ['2481926'], // finerenone
  labCodes: ['33914-3', '6298-4', '14959-1', '4548-4'],
  labThresholds: [
    { loincCode: '33914-3', operator: '>=', value: 25, unit: 'mL/min/1.73m2' },
    { loincCode: '6298-4', operator: '<=', value: 5.0, unit: 'mEq/L' },
    { loincCode: '14959-1', operator: '>=', value: 30, unit: 'mg/g' },
    { loincCode: '4548-4', operator: '>=', value: 6.5, unit: '%' },
  ],
  deviceCodes: [],
  methodologyNote: 'FIDELIO-DKD/FIGARO-DKD: finerenone reduces CV events + CKD progression in T2DM + CKD + UACR >= 30. eGFR >= 25, K+ <= 5.0.',
};

/** Gap 7 — GLP-1 RA in HF with Obesity/T2DM (HF) */
const GAP_007: GapValueSet = {
  gapId: 'GAP-007',
  gapName: 'GLP-1 RA for HFpEF with Obesity',
  module: 'HF',
  diagnosisCodes: [
    'I50.30', 'I50.31', 'I50.32', 'I50.33',
    'E66.01',
    'E11.9', 'E11.65',
  ],
  exclusionCodes: [],
  procedureCodes: [],
  medicationCodes: ['2200016', '2395492', '475968', '897122', '1991306'],
  labCodes: ['4548-4', '18010-0', '86923-0'],
  labThresholds: [
    { loincCode: '18010-0', operator: '>=', value: 40, unit: '%' },
  ],
  deviceCodes: [],
  methodologyNote: 'STEP-HFpEF/SELECT: semaglutide improves KCCQ scores, reduces weight, reduces CV events in HFpEF + obesity. BMI >= 30.',
};

/** Gap 39 — QTc Prolongation Alert (EP) */
const GAP_039: GapValueSet = {
  gapId: 'GAP-039',
  gapName: 'QTc Prolongation Surveillance',
  module: 'EP',
  diagnosisCodes: ['I48.x', 'I47.x', 'I49.x'],
  exclusionCodes: [],
  procedureCodes: [],
  medicationCodes: [
    '596', '3346', '3354', '9068',   // antiarrhythmics
    '8640', '7531', '7049',           // other QT-prolonging
  ],
  labCodes: ['8601-7', '6298-4', '2601-3'],
  labThresholds: [
    { loincCode: '8601-7', operator: '>', value: 500, unit: 'ms' },
    { loincCode: '6298-4', operator: '<', value: 3.5, unit: 'mEq/L' },
    { loincCode: '2601-3', operator: '<', value: 1.5, unit: 'mg/dL' },
  ],
  deviceCodes: [],
  methodologyNote: 'QTc > 500 ms = critical alert. Check electrolytes (K+, Mg2+). Review concomitant QT-prolonging drugs. Dofetilide requires inpatient monitoring.',
};

/** Gap 44 — Digoxin Toxicity Risk (HF) */
const GAP_044: GapValueSet = {
  gapId: 'GAP-044',
  gapName: 'Digoxin Toxicity Prevention',
  module: 'HF',
  diagnosisCodes: ['I50.x', 'I48.x'],
  exclusionCodes: [],
  procedureCodes: [],
  medicationCodes: ['3407'], // digoxin
  labCodes: ['33914-3', '6298-4', '14682-9'],
  labThresholds: [
    { loincCode: '33914-3', operator: '<', value: 30, unit: 'mL/min/1.73m2' },
    { loincCode: '6298-4', operator: '<', value: 3.5, unit: 'mEq/L' },
  ],
  deviceCodes: [],
  methodologyNote: 'DIG trial: target serum digoxin 0.5-0.9 ng/mL. Toxicity risk: renal impairment (eGFR < 30), hypokalemia, advanced age, low body weight, drug interactions (amiodarone, verapamil).',
};

/** Gap 46 — Multivessel CAD Heart Team Review (CAD) */
const GAP_046: GapValueSet = {
  gapId: 'GAP-046',
  gapName: 'Multivessel CAD Heart Team Review',
  module: 'CAD',
  diagnosisCodes: ['I25.10', 'I25.110', 'I25.118', 'I25.119', 'I25.5'],
  exclusionCodes: [],
  procedureCodes: [
    '92928', '92929', '92933',                                     // PCI
    '33510', '33511', '33512', '33513', '33514', '33516',         // CABG vein
    '33533', '33534', '33535', '33536',                            // CABG arterial
    '93454', '93455', '93456', '93457', '93458', '93459',         // cath
    '93571', '93572',                                              // FFR/iFR
  ],
  medicationCodes: [],
  labCodes: ['18010-0'],
  labThresholds: [
    { loincCode: '18010-0', operator: '<', value: 35, unit: '%' },
  ],
  deviceCodes: [],
  methodologyNote: 'SYNTAX/EXCEL: multivessel/left main CAD requires Heart Team discussion (interventional cardiology + cardiac surgery). SYNTAX score, LVEF, diabetes, completeness of revascularization all factor into PCI vs CABG decision.',
};

/** Gap 47 — Complete Revascularization (CAD) */
const GAP_047: GapValueSet = {
  gapId: 'GAP-047',
  gapName: 'Complete Revascularization in STEMI',
  module: 'CAD',
  diagnosisCodes: ['I21.01', 'I21.02', 'I21.09', 'I21.11', 'I21.19', 'I21.21', 'I21.29', 'I21.3'],
  exclusionCodes: [],
  procedureCodes: [
    '92928', '92929',
    '93571', '93572',
    '93454', '93455',
  ],
  medicationCodes: [],
  labCodes: ['67151-1', '49563-0'],
  labThresholds: [],
  deviceCodes: [],
  methodologyNote: 'COMPLETE trial: complete revascularization of non-culprit lesions reduces CV death + MI in STEMI. FFR-guided staging recommended within 45 days of index PCI.',
};

/** Gap 50 — Premature DAPT Discontinuation (CAD) */
const GAP_050: GapValueSet = {
  gapId: 'GAP-050',
  gapName: 'Premature DAPT Discontinuation',
  module: 'CAD',
  diagnosisCodes: ['I21.x', 'I25.10', 'I25.110', 'I25.119'],
  exclusionCodes: [],
  procedureCodes: ['92928', '92929', '92933'],
  medicationCodes: [
    '1191',    // aspirin
    '32968',   // clopidogrel
    '1116632', // ticagrelor
    '1730193', // prasugrel
  ],
  labCodes: [],
  labThresholds: [],
  deviceCodes: [],
  methodologyNote: 'ACC/AHA: minimum 6 months DAPT after DES for stable CAD, 12 months after ACS. Premature discontinuation = highest risk period for stent thrombosis. PRECISE-DAPT/DAPT scores for de-escalation.',
};

/** Gap 65 — Cryptogenic Stroke ILR (EP) */
const GAP_065: GapValueSet = {
  gapId: 'GAP-065',
  gapName: 'Cryptogenic Stroke - Implantable Loop Recorder',
  module: 'EP',
  diagnosisCodes: ['I63.9', 'I63.81', 'G45.9'],
  exclusionCodes: ['I48.x'], // known AF excluded
  procedureCodes: ['33285'], // ILR implant
  medicationCodes: [
    '1114195', '1364430', '1037045', '1599538', // DOACs for when AF found
  ],
  labCodes: [],
  labThresholds: [],
  deviceCodes: ['ILR'],
  methodologyNote: 'CRYSTAL-AF: ILR detects AF in ~30% of cryptogenic stroke patients at 3 years. Earlier detection enables anticoagulation. ESUS + age >= 55 + LA enlargement = highest yield.',
};

/** Gap 81 — Rheumatic MS + AF: DOAC Contraindicated (SH/VD) */
const GAP_081: GapValueSet = {
  gapId: 'GAP-081',
  gapName: 'Rheumatic Mitral Stenosis - DOAC Contraindication',
  module: 'VD',
  diagnosisCodes: ['I05.0', 'I05.2', 'I48.x'],
  exclusionCodes: [],
  procedureCodes: [],
  medicationCodes: [
    '11289',                                          // warfarin (CORRECT therapy)
    '1114195', '1364430', '1037045', '1599538',      // DOACs (CONTRAINDICATED)
  ],
  labCodes: ['6301-6'],
  labThresholds: [
    { loincCode: '6301-6', operator: '>=', value: 2.0, unit: '' },
    { loincCode: '6301-6', operator: '<=', value: 3.0, unit: '' },
  ],
  deviceCodes: [],
  methodologyNote: 'DOACs are CONTRAINDICATED in moderate-severe rheumatic mitral stenosis. Warfarin with target INR 2.0-3.0 is required. This is a SAFETY gap - detect patients on DOACs who should be on warfarin.',
};

/** Gap 86 — IVC Filter Retrieval (PV) */
const GAP_086: GapValueSet = {
  gapId: 'GAP-086',
  gapName: 'IVC Filter Retrieval',
  module: 'PV',
  diagnosisCodes: ['I26.x', 'I82.x', 'Z95.828'],
  exclusionCodes: [],
  procedureCodes: ['37191', '37192', '37193'],
  medicationCodes: [
    '1114195', '1364430', '1037045', '1599538', // DOACs
    '11289', // warfarin
  ],
  labCodes: [],
  labThresholds: [],
  deviceCodes: ['IVC_FILTER'],
  methodologyNote: 'FDA Safety Communication: retrievable IVC filters should be removed once PE/DVT risk resolved and anticoagulation is feasible. Median dwell time should be < 90 days. Track filter insertion date and flag for retrieval.',
};

// ============================================================================
// SKELETON VALUE SETS — Remaining Gaps (with at least diagnosis codes)
// ============================================================================

// --- HF Module (Gaps 5, 8-19) ---
const GAP_005: GapValueSet = { gapId: 'GAP-005', gapName: 'SGLT2i Optimization in HFrEF', module: 'HF', diagnosisCodes: ['I50.20', 'I50.21', 'I50.22', 'I50.23'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1545653', '2200644', '1373463', '2200202'], labCodes: ['33914-3', '18010-0'], labThresholds: [{ loincCode: '18010-0', operator: '<=', value: 40, unit: '%' }], deviceCodes: [], methodologyNote: 'DAPA-HF/EMPEROR-Reduced: SGLT2i reduces CV death + HF hospitalization in HFrEF.' };
const GAP_008: GapValueSet = { gapId: 'GAP-008', gapName: 'ARNI Optimization', module: 'HF', diagnosisCodes: ['I50.20', 'I50.21', 'I50.22', 'I50.23'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1656339'], labCodes: ['18010-0'], labThresholds: [], deviceCodes: [] };
const GAP_009: GapValueSet = { gapId: 'GAP-009', gapName: 'Evidence-Based Beta-Blocker', module: 'HF', diagnosisCodes: ['I50.20', 'I50.21', 'I50.22', 'I50.23'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['20352', '6918', '1520'], labCodes: ['18010-0'], labThresholds: [], deviceCodes: [] };
const GAP_010: GapValueSet = { gapId: 'GAP-010', gapName: 'MRA Optimization', module: 'HF', diagnosisCodes: ['I50.20', 'I50.21', 'I50.22', 'I50.23'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['9997', '3443'], labCodes: ['6298-4', '33914-3'], labThresholds: [], deviceCodes: [] };
const GAP_011: GapValueSet = { gapId: 'GAP-011', gapName: 'Ivabradine Candidacy', module: 'HF', diagnosisCodes: ['I50.22', 'I50.23'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1649480'], labCodes: ['8867-4', '18010-0'], labThresholds: [{ loincCode: '8867-4', operator: '>=', value: 70, unit: 'bpm' }, { loincCode: '18010-0', operator: '<=', value: 35, unit: '%' }], deviceCodes: [] };
const GAP_012: GapValueSet = { gapId: 'GAP-012', gapName: 'Vericiguat Candidacy', module: 'HF', diagnosisCodes: ['I50.20', 'I50.21', 'I50.22', 'I50.23'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['2398091'], labCodes: ['18010-0'], labThresholds: [], deviceCodes: [] };
const GAP_013: GapValueSet = { gapId: 'GAP-013', gapName: 'Hydralazine-ISDN in African American HFrEF', module: 'HF', diagnosisCodes: ['I50.20', 'I50.22'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['5470', '6058'], labCodes: ['18010-0'], labThresholds: [], deviceCodes: [] };
const GAP_014: GapValueSet = { gapId: 'GAP-014', gapName: 'CRT Candidacy', module: 'HF', diagnosisCodes: ['I50.22', 'I50.23', 'I44.7'], exclusionCodes: [], procedureCodes: ['33225'], medicationCodes: [], labCodes: ['10230-1', '18010-0'], labThresholds: [{ loincCode: '10230-1', operator: '>=', value: 150, unit: 'ms' }, { loincCode: '18010-0', operator: '<=', value: 35, unit: '%' }], deviceCodes: [] };
const GAP_015: GapValueSet = { gapId: 'GAP-015', gapName: 'ICD Primary Prevention', module: 'HF', diagnosisCodes: ['I50.22', 'I50.23', 'I42.0', 'I25.5'], exclusionCodes: [], procedureCodes: ['33249', '33230'], medicationCodes: [], labCodes: ['18010-0'], labThresholds: [{ loincCode: '18010-0', operator: '<=', value: 35, unit: '%' }], deviceCodes: [] };
const GAP_016: GapValueSet = { gapId: 'GAP-016', gapName: 'CardioMEMS Candidacy', module: 'HF', diagnosisCodes: ['I50.x'], exclusionCodes: [], procedureCodes: ['33289', '93264'], medicationCodes: [], labCodes: ['33762-6'], labThresholds: [], deviceCodes: ['CARDIOMEMS'] };
const GAP_017: GapValueSet = { gapId: 'GAP-017', gapName: 'LVAD Referral', module: 'HF', diagnosisCodes: ['I50.84', 'I50.82', 'I42.0'], exclusionCodes: [], procedureCodes: ['33975', '33976'], medicationCodes: [], labCodes: ['18010-0'], labThresholds: [{ loincCode: '18010-0', operator: '<=', value: 25, unit: '%' }], deviceCodes: [] };
const GAP_018: GapValueSet = { gapId: 'GAP-018', gapName: 'Transplant Referral', module: 'HF', diagnosisCodes: ['I50.84'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: ['18010-0', '33762-6'], labThresholds: [], deviceCodes: [] };
const GAP_019: GapValueSet = { gapId: 'GAP-019', gapName: 'Cardiac Rehab Referral (HF)', module: 'HF', diagnosisCodes: ['I50.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };

// --- EP Module (Gaps 20-38, 40-43) ---
const GAP_020: GapValueSet = { gapId: 'GAP-020', gapName: 'DOAC vs Warfarin in AF', module: 'EP', diagnosisCodes: ['I48.0', 'I48.1', 'I48.2', 'I48.91'], exclusionCodes: ['I05.0', 'I05.2'], procedureCodes: [], medicationCodes: ['1114195', '1364430', '1037045', '1599538', '11289'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_021: GapValueSet = { gapId: 'GAP-021', gapName: 'AF Anticoagulation Not Prescribed', module: 'EP', diagnosisCodes: ['I48.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1114195', '1364430', '1037045', '1599538', '11289'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_022: GapValueSet = { gapId: 'GAP-022', gapName: 'DOAC Dose Appropriateness', module: 'EP', diagnosisCodes: ['I48.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1114195', '1364430', '1037045', '1599538'], labCodes: ['33914-3', '14682-9'], labThresholds: [], deviceCodes: [] };
const GAP_023: GapValueSet = { gapId: 'GAP-023', gapName: 'AF Catheter Ablation Candidacy', module: 'EP', diagnosisCodes: ['I48.0', 'I48.11', 'I48.19'], exclusionCodes: [], procedureCodes: ['93656'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_024: GapValueSet = { gapId: 'GAP-024', gapName: 'AF Rate vs Rhythm Control', module: 'EP', diagnosisCodes: ['I48.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['596', '3346', '3354', '9068', '4099', '8182'], labCodes: ['8867-4'], labThresholds: [], deviceCodes: [] };
const GAP_025: GapValueSet = { gapId: 'GAP-025', gapName: 'Pill-in-Pocket Strategy', module: 'EP', diagnosisCodes: ['I48.0'], exclusionCodes: ['I50.x'], procedureCodes: [], medicationCodes: ['4099', '8182'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_026: GapValueSet = { gapId: 'GAP-026', gapName: 'SVT Ablation Referral', module: 'EP', diagnosisCodes: ['I47.1', 'I45.6'], exclusionCodes: [], procedureCodes: ['93653'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_027: GapValueSet = { gapId: 'GAP-027', gapName: 'VT Ablation Referral', module: 'EP', diagnosisCodes: ['I47.2', 'I47.0'], exclusionCodes: [], procedureCodes: ['93654'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_028: GapValueSet = { gapId: 'GAP-028', gapName: 'Bradycardia Pacemaker Candidacy', module: 'EP', diagnosisCodes: ['I49.5', 'I44.1', 'I44.2'], exclusionCodes: [], procedureCodes: ['33206', '33207', '33208'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_029: GapValueSet = { gapId: 'GAP-029', gapName: 'Leadless Pacemaker Candidacy', module: 'EP', diagnosisCodes: ['I49.5', 'I44.2'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_030: GapValueSet = { gapId: 'GAP-030', gapName: 'ICD Secondary Prevention', module: 'EP', diagnosisCodes: ['I49.01', 'I47.2'], exclusionCodes: [], procedureCodes: ['33249'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_031: GapValueSet = { gapId: 'GAP-031', gapName: 'Subcutaneous ICD Candidacy', module: 'EP', diagnosisCodes: ['I47.2', 'I49.01'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_032: GapValueSet = { gapId: 'GAP-032', gapName: 'Device Remote Monitoring Enrollment', module: 'EP', diagnosisCodes: ['I48.x', 'I50.x'], exclusionCodes: [], procedureCodes: ['93264'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_033: GapValueSet = { gapId: 'GAP-033', gapName: 'Amiodarone Monitoring - Thyroid', module: 'EP', diagnosisCodes: ['I48.x', 'I47.2'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['596'], labCodes: ['3016-3', '3026-2'], labThresholds: [], deviceCodes: [] };
const GAP_034: GapValueSet = { gapId: 'GAP-034', gapName: 'Amiodarone Monitoring - Liver', module: 'EP', diagnosisCodes: ['I48.x', 'I47.2'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['596'], labCodes: ['1742-6', '1920-8'], labThresholds: [], deviceCodes: [] };
const GAP_035: GapValueSet = { gapId: 'GAP-035', gapName: 'Amiodarone Monitoring - Pulmonary', module: 'EP', diagnosisCodes: ['I48.x', 'I47.2'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['596'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_036: GapValueSet = { gapId: 'GAP-036', gapName: 'Dofetilide Inpatient Initiation', module: 'EP', diagnosisCodes: ['I48.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['3346'], labCodes: ['8601-7', '33914-3', '6298-4'], labThresholds: [{ loincCode: '8601-7', operator: '>', value: 500, unit: 'ms' }], deviceCodes: [] };
const GAP_037: GapValueSet = { gapId: 'GAP-037', gapName: 'AF in HFrEF - Ablation Priority', module: 'EP', diagnosisCodes: ['I48.x', 'I50.22', 'I50.23'], exclusionCodes: [], procedureCodes: ['93656'], medicationCodes: [], labCodes: ['18010-0'], labThresholds: [{ loincCode: '18010-0', operator: '<=', value: 40, unit: '%' }], deviceCodes: [] };
const GAP_038: GapValueSet = { gapId: 'GAP-038', gapName: 'WPW Ablation Referral', module: 'EP', diagnosisCodes: ['I45.6'], exclusionCodes: [], procedureCodes: ['93653'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_040: GapValueSet = { gapId: 'GAP-040', gapName: 'Drug Interaction Alert - Antiarrhythmic', module: 'EP', diagnosisCodes: ['I48.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['596', '3346', '3354', '9068'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_041: GapValueSet = { gapId: 'GAP-041', gapName: 'Sotalol Monitoring', module: 'EP', diagnosisCodes: ['I48.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['9068'], labCodes: ['8601-7', '33914-3', '8867-4'], labThresholds: [], deviceCodes: [] };
const GAP_042: GapValueSet = { gapId: 'GAP-042', gapName: 'AF Stroke Risk Undertreatment', module: 'EP', diagnosisCodes: ['I48.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_043: GapValueSet = { gapId: 'GAP-043', gapName: 'AF Bleeding Risk Optimization', module: 'EP', diagnosisCodes: ['I48.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1114195', '1364430', '1037045', '1599538', '11289'], labCodes: ['718-7', '6301-6'], labThresholds: [], deviceCodes: [] };

// --- CAD Module (Gaps 45, 48-49, 51-64) ---
const GAP_045: GapValueSet = { gapId: 'GAP-045', gapName: 'High-Intensity Statin Post-ACS', module: 'CAD', diagnosisCodes: ['I21.x', 'I20.0'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['36567', '301542'], labCodes: ['2089-1'], labThresholds: [{ loincCode: '2089-1', operator: '>=', value: 70, unit: 'mg/dL' }], deviceCodes: [] };
const GAP_048: GapValueSet = { gapId: 'GAP-048', gapName: 'FFR/iFR Guided PCI', module: 'CAD', diagnosisCodes: ['I25.10', 'I25.119'], exclusionCodes: [], procedureCodes: ['93571', '93572', '92928'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_049: GapValueSet = { gapId: 'GAP-049', gapName: 'Intravascular Imaging in PCI', module: 'CAD', diagnosisCodes: ['I25.x', 'I21.x'], exclusionCodes: [], procedureCodes: ['92978', '92979', '92928'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_051: GapValueSet = { gapId: 'GAP-051', gapName: 'DAPT Escalation in High-Risk ACS', module: 'CAD', diagnosisCodes: ['I21.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1116632', '1730193', '32968'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_052: GapValueSet = { gapId: 'GAP-052', gapName: 'PCSK9 Inhibitor Candidacy', module: 'CAD', diagnosisCodes: ['I25.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1854900', '1741193', '2397641'], labCodes: ['2089-1'], labThresholds: [{ loincCode: '2089-1', operator: '>=', value: 70, unit: 'mg/dL' }], deviceCodes: [] };
const GAP_053: GapValueSet = { gapId: 'GAP-053', gapName: 'Ezetimibe Add-On Therapy', module: 'CAD', diagnosisCodes: ['I25.x', 'I21.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['3820'], labCodes: ['2089-1'], labThresholds: [], deviceCodes: [] };
const GAP_054: GapValueSet = { gapId: 'GAP-054', gapName: 'Bempedoic Acid Candidacy', module: 'CAD', diagnosisCodes: ['I25.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['2380048'], labCodes: ['2089-1'], labThresholds: [], deviceCodes: [] };
const GAP_055: GapValueSet = { gapId: 'GAP-055', gapName: 'Icosapent Ethyl (Vascepa)', module: 'CAD', diagnosisCodes: ['I25.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1553875'], labCodes: ['2571-8'], labThresholds: [{ loincCode: '2571-8', operator: '>=', value: 150, unit: 'mg/dL' }], deviceCodes: [] };
const GAP_056: GapValueSet = { gapId: 'GAP-056', gapName: 'Lipoprotein(a) Screening', module: 'CAD', diagnosisCodes: ['I25.x', 'I21.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: ['43583-4'], labThresholds: [{ loincCode: '43583-4', operator: '>=', value: 50, unit: 'nmol/L' }], deviceCodes: [] };
const GAP_057: GapValueSet = { gapId: 'GAP-057', gapName: 'Cardiac Rehab Referral (CAD)', module: 'CAD', diagnosisCodes: ['I21.x', 'I25.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_058: GapValueSet = { gapId: 'GAP-058', gapName: 'Colchicine for Secondary Prevention', module: 'CAD', diagnosisCodes: ['I25.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['2665'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_059: GapValueSet = { gapId: 'GAP-059', gapName: 'Ranolazine for Refractory Angina', module: 'CAD', diagnosisCodes: ['I20.8', 'I20.9', 'I25.119'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['35829'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_060: GapValueSet = { gapId: 'GAP-060', gapName: 'ACEi/ARB Post-MI', module: 'CAD', diagnosisCodes: ['I21.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['3827', '7226', '8629', '52175', '69749'], labCodes: ['18010-0'], labThresholds: [], deviceCodes: [] };
const GAP_061: GapValueSet = { gapId: 'GAP-061', gapName: 'Beta-Blocker Post-MI', module: 'CAD', diagnosisCodes: ['I21.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['20352', '6918'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_062: GapValueSet = { gapId: 'GAP-062', gapName: 'CCTA vs Stress Testing Appropriateness', module: 'CAD', diagnosisCodes: ['I20.x', 'I25.x'], exclusionCodes: [], procedureCodes: ['75574', '78452', '93350'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_063: GapValueSet = { gapId: 'GAP-063', gapName: 'SGLT2i in CAD + T2DM', module: 'CAD', diagnosisCodes: ['I25.x', 'E11.9', 'E11.65'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1545653', '2200644'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_064: GapValueSet = { gapId: 'GAP-064', gapName: 'GLP-1 RA in ASCVD + T2DM', module: 'CAD', diagnosisCodes: ['I25.x', 'E11.9'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['2200016', '2395492', '475968'], labCodes: ['4548-4'], labThresholds: [], deviceCodes: [] };

// --- SH Module (Gaps 66-80) ---
const GAP_066: GapValueSet = { gapId: 'GAP-066', gapName: 'TAVR Candidacy Evaluation', module: 'SH', diagnosisCodes: ['I35.0', 'I35.2'], exclusionCodes: [], procedureCodes: ['33361', '33363', '33365'], medicationCodes: [], labCodes: ['18148-8', '77912-1', '18010-0'], labThresholds: [], deviceCodes: [] };
const GAP_067: GapValueSet = { gapId: 'GAP-067', gapName: 'TEER (MitraClip) Candidacy', module: 'SH', diagnosisCodes: ['I34.0', 'I50.x'], exclusionCodes: [], procedureCodes: ['33418', '33419'], medicationCodes: [], labCodes: ['18010-0'], labThresholds: [], deviceCodes: [] };
const GAP_068: GapValueSet = { gapId: 'GAP-068', gapName: 'Tricuspid TEER Candidacy', module: 'SH', diagnosisCodes: ['I36.1'], exclusionCodes: [], procedureCodes: ['0544T', '0545T'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_069: GapValueSet = { gapId: 'GAP-069', gapName: 'Bicuspid Aortic Valve Surveillance', module: 'SH', diagnosisCodes: ['Q23.1'], exclusionCodes: [], procedureCodes: ['93306'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_070: GapValueSet = { gapId: 'GAP-070', gapName: 'Obstructive HCM - Mavacamten', module: 'SH', diagnosisCodes: ['I42.1'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['2551804', '2606847'], labCodes: ['18010-0'], labThresholds: [{ loincCode: '18010-0', operator: '>=', value: 55, unit: '%' }], deviceCodes: [] };
const GAP_071: GapValueSet = { gapId: 'GAP-071', gapName: 'Septal Reduction Therapy in HCM', module: 'SH', diagnosisCodes: ['I42.1'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_072: GapValueSet = { gapId: 'GAP-072', gapName: 'Endocarditis Prophylaxis', module: 'SH', diagnosisCodes: ['I35.x', 'I34.x', 'Q23.1'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_073: GapValueSet = { gapId: 'GAP-073', gapName: 'Prosthetic Valve Thrombosis Surveillance', module: 'SH', diagnosisCodes: ['T82.01XA', 'T82.09XA'], exclusionCodes: [], procedureCodes: ['93306', '93312'], medicationCodes: ['11289'], labCodes: ['6301-6'], labThresholds: [], deviceCodes: [] };
const GAP_074: GapValueSet = { gapId: 'GAP-074', gapName: 'Aortic Root Monitoring (Marfan/BAV)', module: 'SH', diagnosisCodes: ['Q23.1', 'I35.1'], exclusionCodes: [], procedureCodes: ['93306'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_075: GapValueSet = { gapId: 'GAP-075', gapName: 'Moderate AS Progression Tracking', module: 'SH', diagnosisCodes: ['I35.0'], exclusionCodes: [], procedureCodes: ['93306'], medicationCodes: [], labCodes: ['18148-8', '77912-1'], labThresholds: [], deviceCodes: [] };
const GAP_076: GapValueSet = { gapId: 'GAP-076', gapName: 'Heart Valve Team Referral', module: 'SH', diagnosisCodes: ['I35.0', 'I34.0', 'I36.1'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_077: GapValueSet = { gapId: 'GAP-077', gapName: 'Post-TAVR Anticoagulation Protocol', module: 'SH', diagnosisCodes: ['I35.0'], exclusionCodes: [], procedureCodes: ['33361', '33363'], medicationCodes: ['1191', '32968'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_078: GapValueSet = { gapId: 'GAP-078', gapName: 'Post-TAVR Pacemaker Need', module: 'SH', diagnosisCodes: ['I35.0', 'I44.2'], exclusionCodes: [], procedureCodes: ['33208'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_079: GapValueSet = { gapId: 'GAP-079', gapName: 'Severe MR Assessment', module: 'SH', diagnosisCodes: ['I34.0'], exclusionCodes: [], procedureCodes: ['93306', '93312'], medicationCodes: [], labCodes: ['18010-0'], labThresholds: [], deviceCodes: [] };
const GAP_080: GapValueSet = { gapId: 'GAP-080', gapName: 'Mitral Annular Calcification Risk', module: 'SH', diagnosisCodes: ['I34.2', 'I34.8'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };

// --- VD Module (Gaps 82-85) ---
const GAP_082: GapValueSet = { gapId: 'GAP-082', gapName: 'Rheumatic Heart Disease Screening', module: 'VD', diagnosisCodes: ['I05.x', 'I06.x'], exclusionCodes: [], procedureCodes: ['93306'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_083: GapValueSet = { gapId: 'GAP-083', gapName: 'Anticoagulation in Mechanical Valve', module: 'VD', diagnosisCodes: ['T82.01XA', 'T82.09XA'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['11289'], labCodes: ['6301-6'], labThresholds: [{ loincCode: '6301-6', operator: '>=', value: 2.5, unit: '' }], deviceCodes: [] };
const GAP_084: GapValueSet = { gapId: 'GAP-084', gapName: 'Bioprosthetic Valve Degeneration Tracking', module: 'VD', diagnosisCodes: ['T82.09XA'], exclusionCodes: [], procedureCodes: ['93306'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_085: GapValueSet = { gapId: 'GAP-085', gapName: 'Multivalvular Disease Assessment', module: 'VD', diagnosisCodes: ['I08.0', 'I08.1', 'I08.2', 'I08.3'], exclusionCodes: [], procedureCodes: ['93306', '93312'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };

// --- PV Module (Gaps 87-104) ---
const GAP_087: GapValueSet = { gapId: 'GAP-087', gapName: 'PAD Statin Therapy', module: 'PV', diagnosisCodes: ['I70.2x', 'I73.9'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['36567', '301542'], labCodes: ['2089-1'], labThresholds: [], deviceCodes: [] };
const GAP_088: GapValueSet = { gapId: 'GAP-088', gapName: 'PAD Antiplatelet Therapy', module: 'PV', diagnosisCodes: ['I70.2x', 'I73.9'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1191', '32968'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_089: GapValueSet = { gapId: 'GAP-089', gapName: 'Cilostazol for Claudication', module: 'PV', diagnosisCodes: ['I70.211', 'I70.212', 'I70.213', 'I70.219'], exclusionCodes: ['I50.x'], procedureCodes: [], medicationCodes: ['24592'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_090: GapValueSet = { gapId: 'GAP-090', gapName: 'ABI Screening', module: 'PV', diagnosisCodes: ['I70.2x', 'I73.9'], exclusionCodes: [], procedureCodes: ['93922', '93923'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_091: GapValueSet = { gapId: 'GAP-091', gapName: 'Critical Limb Ischemia Revascularization', module: 'PV', diagnosisCodes: ['I70.221', 'I70.222', 'I70.229', 'I70.261', 'I70.262', 'I70.269'], exclusionCodes: [], procedureCodes: ['37228', '37229', '37230'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_092: GapValueSet = { gapId: 'GAP-092', gapName: 'AAA Screening', module: 'PV', diagnosisCodes: ['I71.4'], exclusionCodes: [], procedureCodes: ['76706'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_093: GapValueSet = { gapId: 'GAP-093', gapName: 'AAA Size Surveillance', module: 'PV', diagnosisCodes: ['I71.4'], exclusionCodes: [], procedureCodes: ['76706'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_094: GapValueSet = { gapId: 'GAP-094', gapName: 'AAA Repair Candidacy (EVAR/Open)', module: 'PV', diagnosisCodes: ['I71.4'], exclusionCodes: [], procedureCodes: ['34701', '34702'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_095: GapValueSet = { gapId: 'GAP-095', gapName: 'DVT Anticoagulation Duration', module: 'PV', diagnosisCodes: ['I82.4x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1114195', '1364430', '1037045'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_096: GapValueSet = { gapId: 'GAP-096', gapName: 'PE Risk Stratification', module: 'PV', diagnosisCodes: ['I26.x'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: ['67151-1', '33762-6'], labThresholds: [], deviceCodes: [] };
const GAP_097: GapValueSet = { gapId: 'GAP-097', gapName: 'Chronic Thromboembolic PH Screening', module: 'PV', diagnosisCodes: ['I26.x', 'I27.24'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_098: GapValueSet = { gapId: 'GAP-098', gapName: 'Supervised Exercise for PAD', module: 'PV', diagnosisCodes: ['I70.2x', 'I73.9'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_099: GapValueSet = { gapId: 'GAP-099', gapName: 'Rivaroxaban Vascular Dose in PAD', module: 'PV', diagnosisCodes: ['I70.2x'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1364430', '1191'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_100: GapValueSet = { gapId: 'GAP-100', gapName: 'Post-Revascularization Surveillance', module: 'PV', diagnosisCodes: ['I70.2x'], exclusionCodes: [], procedureCodes: ['93922'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_101: GapValueSet = { gapId: 'GAP-101', gapName: 'Wound Care Optimization in CLI', module: 'PV', diagnosisCodes: ['I70.231', 'I70.25'], exclusionCodes: [], procedureCodes: [], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_102: GapValueSet = { gapId: 'GAP-102', gapName: 'Venous Insufficiency Treatment', module: 'PV', diagnosisCodes: ['I87.2'], exclusionCodes: [], procedureCodes: ['36475'], medicationCodes: [], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_103: GapValueSet = { gapId: 'GAP-103', gapName: 'SGLT2i in PAD + T2DM', module: 'PV', diagnosisCodes: ['I70.2x', 'E11.9'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['1545653', '2200644'], labCodes: [], labThresholds: [], deviceCodes: [] };
const GAP_104: GapValueSet = { gapId: 'GAP-104', gapName: 'GLP-1 RA in PAD + T2DM', module: 'PV', diagnosisCodes: ['I70.2x', 'E11.9'], exclusionCodes: [], procedureCodes: [], medicationCodes: ['2200016', '2395492'], labCodes: ['4548-4'], labThresholds: [], deviceCodes: [] };

// ============================================================================
// MASTER EXPORT
// ============================================================================

/**
 * All 104 GapValueSets indexed by gapId.
 */
export const ALL_GAP_VALUE_SETS: Record<string, GapValueSet> = {
  'GAP-001': GAP_001,
  'GAP-002': GAP_002,
  'GAP-003': GAP_003,
  'GAP-004': GAP_004,
  'GAP-005': GAP_005,
  'GAP-006': GAP_006,
  'GAP-007': GAP_007,
  'GAP-008': GAP_008,
  'GAP-009': GAP_009,
  'GAP-010': GAP_010,
  'GAP-011': GAP_011,
  'GAP-012': GAP_012,
  'GAP-013': GAP_013,
  'GAP-014': GAP_014,
  'GAP-015': GAP_015,
  'GAP-016': GAP_016,
  'GAP-017': GAP_017,
  'GAP-018': GAP_018,
  'GAP-019': GAP_019,
  'GAP-020': GAP_020,
  'GAP-021': GAP_021,
  'GAP-022': GAP_022,
  'GAP-023': GAP_023,
  'GAP-024': GAP_024,
  'GAP-025': GAP_025,
  'GAP-026': GAP_026,
  'GAP-027': GAP_027,
  'GAP-028': GAP_028,
  'GAP-029': GAP_029,
  'GAP-030': GAP_030,
  'GAP-031': GAP_031,
  'GAP-032': GAP_032,
  'GAP-033': GAP_033,
  'GAP-034': GAP_034,
  'GAP-035': GAP_035,
  'GAP-036': GAP_036,
  'GAP-037': GAP_037,
  'GAP-038': GAP_038,
  'GAP-039': GAP_039,
  'GAP-040': GAP_040,
  'GAP-041': GAP_041,
  'GAP-042': GAP_042,
  'GAP-043': GAP_043,
  'GAP-044': GAP_044,
  'GAP-045': GAP_045,
  'GAP-046': GAP_046,
  'GAP-047': GAP_047,
  'GAP-048': GAP_048,
  'GAP-049': GAP_049,
  'GAP-050': GAP_050,
  'GAP-051': GAP_051,
  'GAP-052': GAP_052,
  'GAP-053': GAP_053,
  'GAP-054': GAP_054,
  'GAP-055': GAP_055,
  'GAP-056': GAP_056,
  'GAP-057': GAP_057,
  'GAP-058': GAP_058,
  'GAP-059': GAP_059,
  'GAP-060': GAP_060,
  'GAP-061': GAP_061,
  'GAP-062': GAP_062,
  'GAP-063': GAP_063,
  'GAP-064': GAP_064,
  'GAP-065': GAP_065,
  'GAP-066': GAP_066,
  'GAP-067': GAP_067,
  'GAP-068': GAP_068,
  'GAP-069': GAP_069,
  'GAP-070': GAP_070,
  'GAP-071': GAP_071,
  'GAP-072': GAP_072,
  'GAP-073': GAP_073,
  'GAP-074': GAP_074,
  'GAP-075': GAP_075,
  'GAP-076': GAP_076,
  'GAP-077': GAP_077,
  'GAP-078': GAP_078,
  'GAP-079': GAP_079,
  'GAP-080': GAP_080,
  'GAP-081': GAP_081,
  'GAP-082': GAP_082,
  'GAP-083': GAP_083,
  'GAP-084': GAP_084,
  'GAP-085': GAP_085,
  'GAP-086': GAP_086,
  'GAP-087': GAP_087,
  'GAP-088': GAP_088,
  'GAP-089': GAP_089,
  'GAP-090': GAP_090,
  'GAP-091': GAP_091,
  'GAP-092': GAP_092,
  'GAP-093': GAP_093,
  'GAP-094': GAP_094,
  'GAP-095': GAP_095,
  'GAP-096': GAP_096,
  'GAP-097': GAP_097,
  'GAP-098': GAP_098,
  'GAP-099': GAP_099,
  'GAP-100': GAP_100,
  'GAP-101': GAP_101,
  'GAP-102': GAP_102,
  'GAP-103': GAP_103,
  'GAP-104': GAP_104,
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get a GapValueSet by its gap ID.
 */
export function getGapValueSet(gapId: string): GapValueSet | undefined {
  return ALL_GAP_VALUE_SETS[gapId];
}

/**
 * Get all gaps for a specific module.
 */
export function getGapsByModule(module: GapValueSet['module']): GapValueSet[] {
  return Object.values(ALL_GAP_VALUE_SETS).filter(g => g.module === module);
}

/**
 * Get all gap IDs.
 */
export function getAllGapIds(): string[] {
  return Object.keys(ALL_GAP_VALUE_SETS);
}

/**
 * Get the total number of defined gaps.
 */
export function getGapCount(): number {
  return Object.keys(ALL_GAP_VALUE_SETS).length;
}

/**
 * Find all gaps that reference a specific ICD-10 code.
 */
export function findGapsByDiagnosisCode(icd10Code: string): GapValueSet[] {
  return Object.values(ALL_GAP_VALUE_SETS).filter(g =>
    g.diagnosisCodes.some(dc => {
      if (dc.includes('x') || dc.includes('X')) {
        const prefix = dc.replace(/[xX]+$/, '').replace('.', '').toUpperCase();
        return icd10Code.replace('.', '').toUpperCase().startsWith(prefix);
      }
      return dc === icd10Code;
    })
  );
}

/**
 * Find all gaps that reference a specific medication (by RXCUI).
 */
export function findGapsByMedication(rxcui: string): GapValueSet[] {
  return Object.values(ALL_GAP_VALUE_SETS).filter(g =>
    g.medicationCodes.includes(rxcui)
  );
}

/**
 * Find all gaps that reference a specific procedure code.
 */
export function findGapsByProcedure(cptCode: string): GapValueSet[] {
  return Object.values(ALL_GAP_VALUE_SETS).filter(g =>
    g.procedureCodes.includes(cptCode)
  );
}
