import React, { useState, useEffect } from 'react';
import { FileText, Search, CheckCircle, AlertTriangle, ExternalLink, Shield, FlaskConical, Clock, Users, Filter, ChevronDown, ChevronRight } from 'lucide-react';
import { PLATFORM_TOTALS } from '../../../data/platformTotals';

// ── Types ───────────────────────────────────────────────────

type MainTab = 'registry' | 'trial-eligibility';
type RegistryTab = 'cathpci' | 'tvt' | 'icd' | 'gwtg-hf';
type TrialFilter = 'all' | 'phase-2' | 'phase-3' | 'phase-4' | 'industry';

interface RegistryCase {
  id: string;
  name: string;
  date: string;
  completeness: number;
  flags: number;
  status: 'Auto-populated' | 'In Review' | 'Approved' | 'Submitted';
  type: string;
  dtb: number | null;
}

interface RegistryField {
  label: string;
  confidence: number;
  source: 'Structured' | 'Calculated' | 'Inferred' | 'Manual';
  value: string;
}

interface RegistrySection {
  title: string;
  fields: RegistryField[];
}

interface CuratedTrial {
  id: string;
  name: string;
  nct: string;
  phase: string;
  status: string;
  sponsor: string;
  sponsorType: 'industry' | 'investigator' | 'nih';
  eligiblePatients: number;
  gapRef: string;
  gapName: string;
  inclusion: string[];
  exclusion: string[];
}

interface ApiTrial {
  id: string;
  name: string;
  nct: string;
  phase: string;
  status: string;
  sponsor: string;
  sponsorType: 'api';
  conditions: string[];
}

// ── Mock Data: CathPCI Cases ────────────────────────────────

const cathpciCases: RegistryCase[] = [
  { id: 'CP-001', name: 'Martinez, Robert', date: '2026-03-15', completeness: 92, flags: 0, status: 'Approved', type: 'STEMI', dtb: 52 },
  { id: 'CP-002', name: 'Johnson, Patricia', date: '2026-03-14', completeness: 88, flags: 1, status: 'In Review', type: 'STEMI', dtb: 68 },
  { id: 'CP-003', name: 'Chen, William', date: '2026-03-14', completeness: 74, flags: 3, status: 'Auto-populated', type: 'NSTEMI', dtb: null },
  { id: 'CP-004', name: 'Thompson, Sarah', date: '2026-03-13', completeness: 95, flags: 0, status: 'Submitted', type: 'STEMI', dtb: 71 },
  { id: 'CP-005', name: 'Williams, James', date: '2026-03-13', completeness: 56, flags: 6, status: 'Auto-populated', type: 'NSTEMI', dtb: null },
  { id: 'CP-006', name: 'Davis, Maria', date: '2026-03-12', completeness: 81, flags: 2, status: 'In Review', type: 'STEMI', dtb: 89 },
  { id: 'CP-007', name: 'Brown, Michael', date: '2026-03-12', completeness: 67, flags: 4, status: 'Auto-populated', type: 'Elective', dtb: null },
  { id: 'CP-008', name: 'Garcia, Elena', date: '2026-03-11', completeness: 91, flags: 0, status: 'Approved', type: 'STEMI', dtb: 104 },
  { id: 'CP-009', name: 'Wilson, Thomas', date: '2026-03-10', completeness: 43, flags: 8, status: 'Auto-populated', type: 'NSTEMI', dtb: null },
  { id: 'CP-010', name: 'Anderson, Lisa', date: '2026-03-10', completeness: 86, flags: 1, status: 'In Review', type: 'Elective', dtb: null },
];

// ── Mock Data: TVT Cases ────────────────────────────────────

const tvtCases: RegistryCase[] = [
  { id: 'TV-001', name: 'Harrison, Beverly', date: '2026-03-16', completeness: 94, flags: 0, status: 'Approved', type: 'TAVR', dtb: null },
  { id: 'TV-002', name: 'Nguyen, David', date: '2026-03-15', completeness: 78, flags: 2, status: 'In Review', type: 'TAVR', dtb: null },
  { id: 'TV-003', name: 'Patel, Anita', date: '2026-03-14', completeness: 65, flags: 4, status: 'Auto-populated', type: 'MitraClip', dtb: null },
  { id: 'TV-004', name: 'Robinson, Earl', date: '2026-03-13', completeness: 91, flags: 0, status: 'Submitted', type: 'TAVR', dtb: null },
  { id: 'TV-005', name: 'Kim, Soo-Yeon', date: '2026-03-12', completeness: 87, flags: 1, status: 'In Review', type: 'TAVR', dtb: null },
  { id: 'TV-006', name: 'Rivera, Carmen', date: '2026-03-11', completeness: 52, flags: 7, status: 'Auto-populated', type: 'MitraClip', dtb: null },
  { id: 'TV-007', name: 'Stewart, Frank', date: '2026-03-10', completeness: 96, flags: 0, status: 'Submitted', type: 'TAVR', dtb: null },
  { id: 'TV-008', name: 'Lopez, Maria', date: '2026-03-09', completeness: 73, flags: 3, status: 'Auto-populated', type: 'TAVR', dtb: null },
];

// ── Mock Data: ICD Registry Cases ───────────────────────────

const icdCases: RegistryCase[] = [
  { id: 'IC-001', name: 'Foster, Gerald', date: '2026-03-16', completeness: 89, flags: 1, status: 'In Review', type: 'ICD Implant', dtb: null },
  { id: 'IC-002', name: 'Reed, Sandra', date: '2026-03-15', completeness: 93, flags: 0, status: 'Approved', type: 'CRT-D', dtb: null },
  { id: 'IC-003', name: 'Mitchell, Roy', date: '2026-03-14', completeness: 71, flags: 3, status: 'Auto-populated', type: 'ICD Implant', dtb: null },
  { id: 'IC-004', name: 'Brooks, Donna', date: '2026-03-13', completeness: 58, flags: 5, status: 'Auto-populated', type: 'Generator Change', dtb: null },
  { id: 'IC-005', name: 'Campbell, Wayne', date: '2026-03-12', completeness: 97, flags: 0, status: 'Submitted', type: 'CRT-D', dtb: null },
  { id: 'IC-006', name: 'Torres, Isabella', date: '2026-03-11', completeness: 82, flags: 2, status: 'In Review', type: 'ICD Implant', dtb: null },
  { id: 'IC-007', name: 'Phillips, Harold', date: '2026-03-10', completeness: 76, flags: 3, status: 'Auto-populated', type: 'Lead Revision', dtb: null },
  { id: 'IC-008', name: 'Evans, Cynthia', date: '2026-03-09', completeness: 90, flags: 0, status: 'Approved', type: 'S-ICD', dtb: null },
];

// ── Mock Data: GWTG-HF Cases ────────────────────────────────

const gwtgCases: RegistryCase[] = [
  { id: 'GW-001', name: 'Morris, Arthur', date: '2026-03-17', completeness: 88, flags: 1, status: 'In Review', type: 'HFrEF', dtb: null },
  { id: 'GW-002', name: 'Turner, Helen', date: '2026-03-16', completeness: 94, flags: 0, status: 'Approved', type: 'HFpEF', dtb: null },
  { id: 'GW-003', name: 'Collins, Raymond', date: '2026-03-16', completeness: 62, flags: 4, status: 'Auto-populated', type: 'HFrEF', dtb: null },
  { id: 'GW-004', name: 'Edwards, Martha', date: '2026-03-15', completeness: 79, flags: 2, status: 'In Review', type: 'HFmrEF', dtb: null },
  { id: 'GW-005', name: 'Scott, Vernon', date: '2026-03-15', completeness: 91, flags: 0, status: 'Submitted', type: 'HFrEF', dtb: null },
  { id: 'GW-006', name: 'Young, Dorothy', date: '2026-03-14', completeness: 47, flags: 7, status: 'Auto-populated', type: 'HFpEF', dtb: null },
  { id: 'GW-007', name: 'King, Leroy', date: '2026-03-14', completeness: 85, flags: 1, status: 'In Review', type: 'HFrEF', dtb: null },
  { id: 'GW-008', name: 'Wright, Gladys', date: '2026-03-13', completeness: 96, flags: 0, status: 'Approved', type: 'HFrEF', dtb: null },
  { id: 'GW-009', name: 'Adams, Clifford', date: '2026-03-12', completeness: 68, flags: 3, status: 'Auto-populated', type: 'HFmrEF', dtb: null },
  { id: 'GW-010', name: 'Baker, Virginia', date: '2026-03-12', completeness: 83, flags: 2, status: 'In Review', type: 'HFpEF', dtb: null },
  { id: 'GW-011', name: 'Hall, Eugene', date: '2026-03-11', completeness: 55, flags: 5, status: 'Auto-populated', type: 'HFrEF', dtb: null },
  { id: 'GW-012', name: 'Green, Irene', date: '2026-03-10', completeness: 90, flags: 0, status: 'Submitted', type: 'HFpEF', dtb: null },
];

// ── Registry Field Sections ─────────────────────────────────

const cathpciSections: RegistrySection[] = [
  {
    title: 'Presentation',
    fields: [
      { label: 'Admission Date/Time', confidence: 92, source: 'Structured', value: '2026-03-15 06:42' },
      { label: 'Presentation Type', confidence: 98, source: 'Structured', value: 'STEMI' },
      { label: 'Cardiogenic Shock', confidence: 95, source: 'Structured', value: 'No' },
    ],
  },
  {
    title: 'Procedure',
    fields: [
      { label: 'Door-to-Balloon (min)', confidence: 88, source: 'Calculated', value: '52' },
      { label: 'Culprit Vessel', confidence: 72, source: 'Inferred', value: 'LAD - Mid' },
      { label: 'Stent Type', confidence: 96, source: 'Structured', value: 'DES - Xience Sierra' },
      { label: 'Access Site', confidence: 98, source: 'Structured', value: 'Radial - Right' },
      { label: 'Contrast Volume', confidence: 90, source: 'Structured', value: '145 mL' },
    ],
  },
  {
    title: 'Clinical Data',
    fields: [
      { label: 'LVEF', confidence: 85, source: 'Structured', value: '45%' },
      { label: 'In-Hospital Mortality', confidence: 99, source: 'Structured', value: 'No' },
    ],
  },
  {
    title: 'Discharge Medications',
    fields: [
      { label: 'Aspirin', confidence: 97, source: 'Structured', value: 'Yes - 81mg daily' },
      { label: 'P2Y12 Inhibitor', confidence: 95, source: 'Structured', value: 'Ticagrelor 90mg BID' },
      { label: 'Statin', confidence: 94, source: 'Structured', value: 'Atorvastatin 80mg' },
      { label: 'ACE-I/ARB', confidence: 88, source: 'Structured', value: 'Lisinopril 10mg' },
      { label: 'Beta-Blocker', confidence: 91, source: 'Structured', value: 'Metoprolol Succinate 50mg' },
    ],
  },
];

const tvtSections: RegistrySection[] = [
  {
    title: 'Patient Demographics',
    fields: [
      { label: 'Age / Sex', confidence: 99, source: 'Structured', value: '82 / Female' },
      { label: 'STS PROM', confidence: 91, source: 'Calculated', value: '4.2%' },
      { label: 'Frailty Index', confidence: 74, source: 'Inferred', value: 'Moderate' },
    ],
  },
  {
    title: 'Valve Assessment',
    fields: [
      { label: 'Aortic Valve Area', confidence: 93, source: 'Structured', value: '0.7 cm2' },
      { label: 'Mean Gradient', confidence: 96, source: 'Structured', value: '48 mmHg' },
      { label: 'Annulus Diameter', confidence: 89, source: 'Structured', value: '23.1 mm' },
      { label: 'LVEF', confidence: 88, source: 'Structured', value: '55%' },
    ],
  },
  {
    title: 'Procedure Details',
    fields: [
      { label: 'Valve Type', confidence: 98, source: 'Structured', value: 'Edwards SAPIEN 3 Ultra' },
      { label: 'Access Route', confidence: 97, source: 'Structured', value: 'Transfemoral' },
      { label: 'Valve Size', confidence: 95, source: 'Structured', value: '23mm' },
      { label: 'Post-deployment AR', confidence: 82, source: 'Inferred', value: 'None/Trace' },
    ],
  },
  {
    title: '30-Day Outcomes',
    fields: [
      { label: 'Mortality', confidence: 99, source: 'Structured', value: 'No' },
      { label: 'Stroke', confidence: 98, source: 'Structured', value: 'No' },
      { label: 'New Pacemaker', confidence: 94, source: 'Structured', value: 'No' },
    ],
  },
];

const icdSections: RegistrySection[] = [
  {
    title: 'Indication',
    fields: [
      { label: 'Primary vs Secondary Prevention', confidence: 96, source: 'Structured', value: 'Primary Prevention' },
      { label: 'LVEF', confidence: 92, source: 'Structured', value: '28%' },
      { label: 'NYHA Class', confidence: 89, source: 'Structured', value: 'Class II' },
      { label: 'QRS Duration', confidence: 94, source: 'Structured', value: '118 ms' },
    ],
  },
  {
    title: 'Device Details',
    fields: [
      { label: 'Device Type', confidence: 98, source: 'Structured', value: 'Single-Chamber ICD' },
      { label: 'Manufacturer', confidence: 97, source: 'Structured', value: 'Medtronic' },
      { label: 'Model', confidence: 95, source: 'Structured', value: 'Cobalt XT' },
      { label: 'Lead Type', confidence: 93, source: 'Structured', value: 'Sprint Quattro' },
    ],
  },
  {
    title: 'Implant Data',
    fields: [
      { label: 'R-wave Amplitude', confidence: 87, source: 'Structured', value: '11.2 mV' },
      { label: 'Impedance', confidence: 91, source: 'Structured', value: '520 ohms' },
      { label: 'DFT Tested', confidence: 76, source: 'Inferred', value: 'Yes - Successful' },
      { label: 'Complications', confidence: 99, source: 'Structured', value: 'None' },
    ],
  },
];

const gwtgSections: RegistrySection[] = [
  {
    title: 'Admission',
    fields: [
      { label: 'Admission Source', confidence: 94, source: 'Structured', value: 'Emergency Department' },
      { label: 'HF Type', confidence: 88, source: 'Structured', value: 'HFrEF' },
      { label: 'LVEF at Admission', confidence: 86, source: 'Structured', value: '25%' },
      { label: 'NT-proBNP', confidence: 91, source: 'Structured', value: '4,820 pg/mL' },
    ],
  },
  {
    title: 'In-Hospital Treatment',
    fields: [
      { label: 'IV Diuretics Given', confidence: 97, source: 'Structured', value: 'Yes - Furosemide 80mg' },
      { label: 'Inotrope Use', confidence: 93, source: 'Structured', value: 'No' },
      { label: 'Weight Change', confidence: 78, source: 'Calculated', value: '-3.2 kg' },
    ],
  },
  {
    title: 'Discharge GDMT',
    fields: [
      { label: 'ACE-I/ARB/ARNI', confidence: 95, source: 'Structured', value: 'Sacubitril/Valsartan 49/51mg BID' },
      { label: 'Beta-Blocker', confidence: 94, source: 'Structured', value: 'Carvedilol 12.5mg BID' },
      { label: 'MRA', confidence: 90, source: 'Structured', value: 'Spironolactone 25mg' },
      { label: 'SGLT2i', confidence: 68, source: 'Inferred', value: 'Dapagliflozin 10mg' },
      { label: 'Hydralazine/Nitrate', confidence: 85, source: 'Structured', value: 'Not Indicated' },
    ],
  },
  {
    title: 'Discharge Planning',
    fields: [
      { label: 'Follow-up within 7 days', confidence: 72, source: 'Inferred', value: 'Scheduled' },
      { label: 'Cardiac Rehab Referral', confidence: 65, source: 'Inferred', value: 'Pending' },
      { label: 'ICD Evaluation Documented', confidence: 81, source: 'Inferred', value: 'Yes' },
    ],
  },
];

// ── Registry section lookup ─────────────────────────────────

const registrySectionsMap: Record<RegistryTab, RegistrySection[]> = {
  cathpci: cathpciSections,
  tvt: tvtSections,
  icd: icdSections,
  'gwtg-hf': gwtgSections,
};

const registryCasesMap: Record<RegistryTab, RegistryCase[]> = {
  cathpci: cathpciCases,
  tvt: tvtCases,
  icd: icdCases,
  'gwtg-hf': gwtgCases,
};

// ── Mock Data: Curated Trials ───────────────────────────────

const curatedTrials: CuratedTrial[] = [
  { id: 'T01', name: 'HELIOS-B Extension -- Vutrisiran Long-Term', nct: 'NCT04153058', phase: '3', status: 'Enrolling', sponsor: 'Alnylam Pharmaceuticals', sponsorType: 'industry', eligiblePatients: PLATFORM_TOTALS.modules.hf.patients > 0 ? 127 : 0, gapRef: 'Gap 1', gapName: 'ATTR-CM Detection', inclusion: ['ATTR-CM confirmed by Tc-99m PYP or biopsy', 'NYHA I-III', 'LVEF >=40%'], exclusion: ['Prior tafamidis', 'Severe renal impairment', 'Liver transplant'] },
  { id: 'T02', name: 'STEP-HFpEF Long-Term Outcomes Registry', nct: 'NCT04788511', phase: '4', status: 'Enrolling', sponsor: 'Novo Nordisk', sponsorType: 'industry', eligiblePatients: 198, gapRef: 'Gap 7', gapName: 'GLP-1 RA Obese HFpEF', inclusion: ['HFpEF LVEF >=45%', 'BMI >=30', 'NYHA II-III'], exclusion: ['T1DM', 'Prior bariatric surgery', 'eGFR <30'] },
  { id: 'T03', name: 'OCEAN(a) -- Olpasiran CV Outcomes', nct: 'NCT05581303', phase: '3', status: 'Enrolling', sponsor: 'Amgen', sponsorType: 'industry', eligiblePatients: 312, gapRef: 'Gap 23', gapName: 'Lp(a) Screening', inclusion: ['ASCVD', 'Lp(a) >=150 nmol/L', 'On maximally tolerated statin'], exclusion: ['Recent ACS <3 months', 'eGFR <30'] },
  { id: 'T04', name: 'MAPLE-HCM Long-Term Extension', nct: 'NCT05186818', phase: '3', status: 'Enrolling', sponsor: 'Cytokinetics', sponsorType: 'industry', eligiblePatients: 43, gapRef: 'Gap 12', gapName: 'HCM Myosin Inhibitor', inclusion: ['Obstructive HCM', 'LVOT gradient >=30mmHg', 'NYHA II-III', 'LVEF >=55%'], exclusion: ['Prior septal reduction', 'LVEF <50%'] },
  { id: 'T05', name: 'DECISION-CTO 2 -- Randomized Trial', nct: 'NCT03733626', phase: '3', status: 'Screening', sponsor: 'Korean Society of IC', sponsorType: 'investigator', eligiblePatients: 94, gapRef: 'Gap 48', gapName: 'CTO PCI Referral', inclusion: ['CTO confirmed on angiography', 'Stable angina CCS II-III', 'On medical therapy'], exclusion: ['Recent MI <1 month', 'LVEF <25%', 'Prior CABG of CTO vessel'] },
  { id: 'T06', name: 'HEART-FID -- Ferric Carboxymaltose in HF', nct: 'NCT03037931', phase: '3', status: 'Enrolling', sponsor: 'AHA / NIH', sponsorType: 'nih', eligiblePatients: 287, gapRef: 'Gap 2', gapName: 'Iron Deficiency Untreated', inclusion: ['HF LVEF <=40%', 'Ferritin <100 or TSAT <20%', 'NYHA II-III'], exclusion: ['Hemoglobin <9', 'IV iron within 6 weeks'] },
  { id: 'T07', name: 'FINEARTS-HF Long-Term Extension', nct: 'NCT04435626', phase: '3', status: 'Enrolling', sponsor: 'Bayer', sponsorType: 'industry', eligiblePatients: 312, gapRef: 'Gap 6', gapName: 'Finerenone Gap', inclusion: ['HF LVEF >=40%', 'eGFR >=25', 'K+ <5.0', 'Elevated NT-proBNP'], exclusion: ['eGFR <25', 'K+ >=5.5'] },
  { id: 'T08', name: 'GUIDE-HF 2 -- Hemodynamic-Guided Management', nct: 'NCT03387813', phase: '4', status: 'Enrolling', sponsor: 'Abbott', sponsorType: 'industry', eligiblePatients: 253, gapRef: 'Gap 13', gapName: 'CardioMEMS Eligible', inclusion: ['NYHA III', 'HF hospitalization within 12 months', 'Any LVEF'], exclusion: ['Cardiac surgery planned', 'GFR <25'] },
  { id: 'T09', name: 'ORION-4 -- Inclisiran CV Outcomes', nct: 'NCT03705234', phase: '3', status: 'Enrolling', sponsor: 'Novartis', sponsorType: 'industry', eligiblePatients: 234, gapRef: 'Gap 15', gapName: 'LDL Not at Goal', inclusion: ['ASCVD', 'LDL >=70 on max statin', 'Age >=55'], exclusion: ['Recent ACS <90 days', 'Liver disease'] },
  { id: 'T10', name: 'BeAT-HF Long-Term Registry Extension', nct: 'NCT02627196', phase: '4', status: 'Enrolling', sponsor: 'CVRx', sponsorType: 'industry', eligiblePatients: 34, gapRef: 'Gap 36', gapName: 'Stage D HF', inclusion: ['NYHA III', 'LVEF <=35%', 'QRS <130ms', 'On optimal GDMT'], exclusion: ['CRT candidate', 'Recent cardiac surgery'] },
  { id: 'T11', name: 'ATTR-AS Registry -- Co-existing Amyloidosis and AS', nct: 'Investigator-initiated', phase: 'Registry', status: 'Enrolling', sponsor: 'Academic Medical Center Consortium', sponsorType: 'investigator', eligiblePatients: 18, gapRef: 'Gap 42', gapName: 'ATTR-CM + AS Co-Detection', inclusion: ['Severe AS confirmed', 'Age >=75', 'LV wall >=14mm'], exclusion: ['Prior ATTR-CM diagnosis', 'Prior TAVR'] },
  { id: 'T12', name: 'MANIFEST-PF -- PFA Registry', nct: 'NCT05414136', phase: '4', status: 'Enrolling', sponsor: 'Medtronic', sponsorType: 'industry', eligiblePatients: 58, gapRef: 'Gap 11', gapName: 'AF Recurrence Post-Ablation PFA', inclusion: ['Prior AF ablation >12 months', 'AF recurrence after blanking period'], exclusion: ['Prior PFA ablation', 'LVEF <25%'] },
  { id: 'T13', name: 'GUIDE-IT 2 -- NT-proBNP Guided Therapy', nct: 'Investigator-initiated', phase: '3', status: 'Screening', sponsor: 'NHLBI / Regional Health System', sponsorType: 'nih', eligiblePatients: 234, gapRef: 'Gap 74', gapName: 'NT-proBNP Not Monitored', inclusion: ['HF NYHA II-III', 'NT-proBNP >500', 'On GDMT'], exclusion: ['Recent hospitalization <2 weeks', 'CKD stage 5'] },
  { id: 'T14', name: 'EARLY-TAVR Extended Follow-up', nct: 'NCT03042104', phase: '3', status: 'Enrolling', sponsor: 'Edwards Lifesciences', sponsorType: 'industry', eligiblePatients: 72, gapRef: 'Gap 3', gapName: 'Asymptomatic Severe AS', inclusion: ['Severe AS', 'Asymptomatic', 'STS PROM <3%'], exclusion: ['Symptomatic AS', 'Other valve disease requiring intervention'] },
];

// ── Mock PIs ────────────────────────────────────────────────

const trialPIs: Record<string, { name: string; dept: string }> = {
  T01: { name: 'Dr. Maurer, Mathew', dept: 'Cardiology / Amyloidosis Program' },
  T02: { name: 'Dr. Shah, Sanjiv', dept: 'Heart Failure & Cardiomyopathy' },
  T03: { name: 'Dr. Rosenson, Robert', dept: 'Lipidology & Preventive Cardiology' },
  T04: { name: 'Dr. Braunwald, Eugene', dept: 'Cardiovascular Medicine' },
  T05: { name: 'Dr. Kirtane, Ajay', dept: 'Interventional Cardiology' },
  T06: { name: 'Dr. Anand, Inder', dept: 'Heart Failure Medicine' },
  T07: { name: 'Dr. Pitt, Bertram', dept: 'Heart Failure & Nephrocardiology' },
  T08: { name: 'Dr. Abraham, William', dept: 'Advanced Heart Failure' },
  T09: { name: 'Dr. Ray, Kausik', dept: 'Preventive Cardiology' },
  T10: { name: 'Dr. Zile, Michael', dept: 'Advanced Devices & Heart Failure' },
  T11: { name: 'Dr. Castano, Adam', dept: 'Structural Heart / Amyloidosis' },
  T12: { name: 'Dr. Reddy, Vivek', dept: 'Electrophysiology' },
  T13: { name: 'Dr. Felker, Michael', dept: 'Heart Failure Medicine' },
  T14: { name: 'Dr. Leon, Martin', dept: 'Structural Heart' },
};

// ── Flag data by case ───────────────────────────────────────

const caseFlags: Record<string, Array<{ field: string; issue: string; recommendation: string }>> = {
  'CP-002': [{ field: 'Door-to-Balloon', issue: 'Above 60 min threshold', recommendation: 'Verify arrival time documentation for accuracy' }],
  'CP-003': [
    { field: 'Culprit Vessel', issue: 'Low confidence', recommendation: 'Review angiography report for vessel identification' },
    { field: 'LVEF', issue: 'Missing value', recommendation: 'Add echo results from post-PCI assessment' },
    { field: 'Discharge Meds', issue: 'Incomplete', recommendation: 'Confirm P2Y12 and statin at discharge' },
  ],
  'CP-005': [
    { field: 'Admission DateTime', issue: 'Conflicting sources', recommendation: 'Reconcile ED arrival vs registration timestamp' },
    { field: 'Culprit Vessel', issue: 'Not documented', recommendation: 'Extract from catheterization report' },
    { field: 'Stent Type', issue: 'Missing', recommendation: 'Query cath lab inventory system' },
    { field: 'LVEF', issue: 'Missing', recommendation: 'Obtain echo or LV gram data' },
    { field: 'ACE-I/ARB', issue: 'Not prescribed', recommendation: 'Document contraindication or initiate therapy' },
    { field: 'Beta-Blocker', issue: 'Not prescribed', recommendation: 'Document contraindication or initiate therapy' },
  ],
  'CP-006': [
    { field: 'Door-to-Balloon', issue: 'DTB 89 min - exceeds benchmark', recommendation: 'Flag for STEMI process improvement review' },
    { field: 'P2Y12 Inhibitor', issue: 'Low confidence', recommendation: 'Verify medication reconciliation at discharge' },
  ],
  'CP-007': [
    { field: 'Pre-procedure LVEF', issue: 'Missing', recommendation: 'Retrieve from pre-op echo' },
    { field: 'Access Site Closure', issue: 'Not documented', recommendation: 'Add closure device data from procedure note' },
    { field: 'Contrast Volume', issue: 'Low confidence', recommendation: 'Confirm from cath lab automated log' },
    { field: 'Statin at Discharge', issue: 'Missing', recommendation: 'Document statin prescription or reason omitted' },
  ],
  'CP-008': [{ field: 'Door-to-Balloon', issue: 'DTB 104 min - exceeds threshold', recommendation: 'Document transfer delay or system issue' }],
  'CP-009': [
    { field: 'Presentation Type', issue: 'Ambiguous documentation', recommendation: 'Clarify NSTEMI vs unstable angina with troponin data' },
    { field: 'Admission DateTime', issue: 'Conflicting timestamps', recommendation: 'Reconcile EMS arrival, ED triage, and registration times' },
    { field: 'Culprit Vessel', issue: 'Not identified', recommendation: 'Extract from angiography findings' },
    { field: 'Stent Details', issue: 'Missing entirely', recommendation: 'Pull from cath lab record' },
    { field: 'Access Site', issue: 'Not documented', recommendation: 'Review procedure note' },
    { field: 'LVEF', issue: 'Not recorded', recommendation: 'Add echo or LV gram data' },
    { field: 'Discharge Medications', issue: 'Incomplete reconciliation', recommendation: 'Complete medication list from pharmacy system' },
    { field: 'Follow-up Plan', issue: 'Not documented', recommendation: 'Add outpatient follow-up date' },
  ],
  'CP-010': [{ field: 'Statin Documented', issue: 'Low confidence', recommendation: 'Verify with pharmacy discharge records' }],
  'TV-002': [
    { field: 'Frailty Index', issue: 'Low confidence score', recommendation: 'Validate with 5-meter walk test result' },
    { field: 'Post-deployment AR', issue: 'Subjective grading', recommendation: 'Confirm with quantitative echo measurement' },
  ],
  'TV-003': [
    { field: 'STS PROM', issue: 'Missing input variables', recommendation: 'Complete dialysis status and prior cardiac surgery fields' },
    { field: 'Annulus Sizing', issue: 'CT vs echo discrepancy', recommendation: 'Reconcile CT annulus measurement with echo data' },
    { field: 'Frailty Index', issue: 'Not assessed', recommendation: 'Complete frailty assessment before submission' },
    { field: 'Post-deployment AR', issue: 'Not graded', recommendation: 'Add post-procedure echo AR assessment' },
  ],
  'TV-006': [
    { field: 'Age / Sex', issue: 'Demographics incomplete', recommendation: 'Verify patient demographics in EMR' },
    { field: 'STS PROM', issue: 'Cannot calculate', recommendation: 'Complete all required input fields' },
    { field: 'Valve Assessment', issue: 'Missing echo data', recommendation: 'Upload pre-procedure echocardiogram' },
    { field: 'Access Route', issue: 'Not documented', recommendation: 'Extract from operative report' },
    { field: 'Valve Size', issue: 'Missing', recommendation: 'Confirm from implant record' },
    { field: 'Post-deployment AR', issue: 'Missing', recommendation: 'Obtain post-procedure echo' },
    { field: '30-Day Follow-up', issue: 'Not scheduled', recommendation: 'Schedule and document 30-day visit' },
  ],
  'TV-008': [
    { field: 'Frailty Index', issue: 'Incomplete assessment', recommendation: 'Complete gait speed and grip strength' },
    { field: 'Post-deployment AR', issue: 'Low confidence', recommendation: 'Review echo images for AR grading' },
    { field: 'Access Site Complication', issue: 'Not documented', recommendation: 'Confirm vascular closure outcome' },
  ],
  'IC-001': [{ field: 'DFT Tested', issue: 'Documentation unclear', recommendation: 'Clarify DFT testing status in operative note' }],
  'IC-003': [
    { field: 'QRS Duration', issue: 'Low confidence', recommendation: 'Verify from pre-procedure 12-lead ECG' },
    { field: 'DFT Tested', issue: 'Not documented', recommendation: 'Extract from implant procedure note' },
    { field: 'Lead Impedance', issue: 'Missing', recommendation: 'Pull from device interrogation report' },
  ],
  'IC-004': [
    { field: 'Indication', issue: 'Incomplete documentation', recommendation: 'Document generator change indication and prior device info' },
    { field: 'Prior Device Model', issue: 'Missing', recommendation: 'Extract from previous implant record' },
    { field: 'Battery Voltage', issue: 'Not recorded', recommendation: 'Document explanted generator battery status' },
    { field: 'Lead Integrity', issue: 'Not assessed', recommendation: 'Document lead impedance and threshold checks' },
    { field: 'Complications', issue: 'Not documented', recommendation: 'Complete complication assessment' },
  ],
  'IC-006': [
    { field: 'NYHA Class', issue: 'Ambiguous documentation', recommendation: 'Clarify functional class from clinic notes' },
    { field: 'DFT Tested', issue: 'Low confidence', recommendation: 'Confirm DFT protocol completion' },
  ],
  'IC-007': [
    { field: 'Lead Revision Indication', issue: 'Incomplete', recommendation: 'Document reason for lead revision' },
    { field: 'New Lead Model', issue: 'Missing', recommendation: 'Record new lead specifications' },
    { field: 'Extracted Lead Data', issue: 'Not documented', recommendation: 'Complete extraction details' },
  ],
  'GW-001': [{ field: 'Cardiac Rehab Referral', issue: 'Not documented', recommendation: 'Document rehab referral or contraindication' }],
  'GW-003': [
    { field: 'SGLT2i', issue: 'Low confidence', recommendation: 'Verify SGLT2i prescription at discharge' },
    { field: 'Follow-up within 7 days', issue: 'Not scheduled', recommendation: 'Schedule 7-day post-discharge visit' },
    { field: 'Weight Change', issue: 'Incomplete data', recommendation: 'Document daily weights during admission' },
    { field: 'ICD Evaluation', issue: 'Not documented', recommendation: 'Complete ICD candidacy assessment' },
  ],
  'GW-004': [
    { field: 'HF Type Classification', issue: 'Borderline LVEF', recommendation: 'Confirm HFmrEF classification with repeat echo' },
    { field: 'SGLT2i', issue: 'Not prescribed', recommendation: 'Document contraindication or initiate SGLT2i' },
  ],
  'GW-006': [
    { field: 'LVEF at Admission', issue: 'Missing', recommendation: 'Obtain echocardiogram data' },
    { field: 'NT-proBNP', issue: 'Not ordered', recommendation: 'Add biomarker results' },
    { field: 'IV Diuretic Details', issue: 'Incomplete', recommendation: 'Document diuretic regimen and response' },
    { field: 'Discharge GDMT', issue: 'Multiple gaps', recommendation: 'Complete all GDMT medication documentation' },
    { field: 'Weight Change', issue: 'Daily weights missing', recommendation: 'Extract from nursing flowsheets' },
    { field: 'Follow-up Plan', issue: 'Not documented', recommendation: 'Schedule and document post-discharge follow-up' },
    { field: 'Cardiac Rehab', issue: 'Not addressed', recommendation: 'Document rehab referral status' },
  ],
  'GW-007': [{ field: 'SGLT2i', issue: 'Not prescribed at discharge', recommendation: 'Add SGLT2i or document contraindication' }],
  'GW-009': [
    { field: 'LVEF', issue: 'Borderline value', recommendation: 'Confirm LVEF with repeat imaging' },
    { field: 'MRA', issue: 'Not prescribed', recommendation: 'Evaluate potassium and renal function for MRA candidacy' },
    { field: 'Cardiac Rehab', issue: 'Not referred', recommendation: 'Document rehab referral or barrier' },
  ],
  'GW-010': [
    { field: 'NT-proBNP Trend', issue: 'Missing discharge value', recommendation: 'Obtain pre-discharge biomarker' },
    { field: 'Follow-up Appointment', issue: 'Low confidence', recommendation: 'Confirm 7-day follow-up scheduling' },
  ],
  'GW-011': [
    { field: 'Admission Source', issue: 'Unclear documentation', recommendation: 'Clarify ED vs direct admission path' },
    { field: 'LVEF', issue: 'Missing', recommendation: 'Obtain echocardiogram' },
    { field: 'GDMT at Discharge', issue: 'Incomplete', recommendation: 'Complete medication reconciliation' },
    { field: 'Weight Monitoring', issue: 'Gaps in daily weights', recommendation: 'Extract from nursing records' },
    { field: 'ICD Evaluation', issue: 'Not assessed', recommendation: 'Document ICD candidacy evaluation' },
  ],
};

// ── Helpers ──────────────────────────────────────────────────

function completenessColor(pct: number): string {
  if (pct >= 85) return 'bg-titanium-300';
  if (pct >= 60) return 'bg-chrome-50';
  return 'bg-red-500';
}

function completenessTextColor(pct: number): string {
  if (pct >= 85) return 'text-teal-700';
  if (pct >= 60) return 'text-gray-500';
  return 'text-red-700';
}

function confidenceDot(pct: number): string {
  if (pct >= 85) return 'bg-titanium-300';
  if (pct >= 60) return 'bg-chrome-50';
  return 'bg-red-500';
}

function sourceChip(src: string): string {
  switch (src) {
    case 'Structured': return 'bg-slate-100 text-slate-700';
    case 'Calculated': return 'bg-blue-100 text-blue-700';
    case 'Inferred': return 'bg-amber-50 text-amber-600';
    case 'Manual': return 'bg-slate-100 text-slate-700';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function statusChip(status: string): string {
  switch (status) {
    case 'Approved': return 'bg-green-50 text-green-600';
    case 'Submitted': return 'bg-blue-100 text-blue-800';
    case 'In Review': return 'bg-amber-50 text-amber-600';
    case 'Auto-populated': return 'bg-slate-100 text-slate-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function sponsorBadge(type: string): string {
  switch (type) {
    case 'industry': return 'bg-amber-50 text-amber-600';
    case 'investigator': return 'bg-slate-100 text-slate-700';
    case 'nih': return 'bg-green-50 text-green-600';
    case 'api': return 'bg-green-50 text-green-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

function sponsorLabel(type: string): string {
  switch (type) {
    case 'industry': return 'Industry';
    case 'investigator': return 'Investigator';
    case 'nih': return 'NIH';
    case 'api': return 'ClinicalTrials.gov';
    default: return type;
  }
}

// ── Component ───────────────────────────────────────────────

const ResearchServiceLineView: React.FC = () => {
  const [activeTab, _setActiveTab] = useState<MainTab>('registry');
  const setActiveTab = (tab: MainTab) => {
    _setActiveTab(tab);
    const scrollContainer = document.querySelector('.overflow-y-auto.h-screen');
    if (scrollContainer) scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const [activeRegistry, setActiveRegistry] = useState<RegistryTab>('cathpci');
  const [selectedCase, setSelectedCase] = useState<string | null>('CP-001');
  const [selectedTrial, setSelectedTrial] = useState<string | null>(null);
  const [trialFilter, setTrialFilter] = useState<TrialFilter>('all');
  const [apiTrials, setApiTrials] = useState<ApiTrial[]>([]);
  const [apiLoading, setApiLoading] = useState<boolean>(false);
  const [apiError, setApiError] = useState<boolean>(false);

  // ── ClinicalTrials.gov API fetch ────────────────────────
  useEffect(() => {
    if (activeTab !== 'trial-eligibility') return;
    setApiLoading(true);
    setApiError(false);

    const url =
      'https://clinicaltrials.gov/api/v2/studies?query.cond=Heart+Failure+OR+Atrial+Fibrillation+OR+Coronary+Artery+Disease+OR+Aortic+Stenosis&filter.overallStatus=RECRUITING&pageSize=10&fields=NCTId,BriefTitle,Condition,Phase,OverallStatus,LeadSponsorName,LeadSponsorClass';

    fetch(url)
      .then((res) => {
        if (!res.ok) throw new Error('API error');
        return res.json();
      })
      .then((data) => {
        const studies = data.studies ?? [];
        const parsed: ApiTrial[] = studies.map((s: any, idx: number) => {
          const proto = s.protocolSection ?? {};
          const id = proto.identificationModule ?? {};
          const status = proto.statusModule ?? {};
          const design = proto.designModule ?? {};
          const sponsor = proto.sponsorCollaboratorsModule?.leadSponsor ?? {};
          const conditions = proto.conditionsModule?.conditions ?? [];
          const phases = design.phases ?? [];
          return {
            id: `API-${idx + 1}`,
            name: id.briefTitle ?? 'Untitled Study',
            nct: id.nctId ?? '',
            phase: phases.length > 0 ? phases[phases.length - 1].replace('PHASE', 'Phase ').replace('_', ' ') : 'N/A',
            status: status.overallStatus === 'RECRUITING' ? 'Recruiting' : (status.overallStatus ?? 'Unknown'),
            sponsor: sponsor.name ?? 'Unknown',
            sponsorType: 'api' as const,
            conditions,
          };
        });
        setApiTrials(parsed);
        setApiLoading(false);
      })
      .catch(() => {
        setApiError(true);
        setApiLoading(false);
      });
  }, [activeTab]);

  // ── Derived data ────────────────────────────────────────
  const cases = registryCasesMap[activeRegistry];
  const sections = registrySectionsMap[activeRegistry];
  const currentCase = cases.find((c) => c.id === selectedCase) ?? null;
  const flags = selectedCase ? caseFlags[selectedCase] ?? [] : [];

  // Field count helpers for right panel
  const totalFields = sections.reduce((s, sec) => s + sec.fields.length, 0);
  const highConf = sections.reduce((s, sec) => s + sec.fields.filter((f) => f.confidence >= 85).length, 0);
  const needsReview = sections.reduce((s, sec) => s + sec.fields.filter((f) => f.confidence >= 60 && f.confidence < 85).length, 0);
  const missing = sections.reduce((s, sec) => s + sec.fields.filter((f) => f.confidence < 60).length, 0);
  const structured = sections.reduce((s, sec) => s + sec.fields.filter((f) => f.source === 'Structured').length, 0);
  const calculated = sections.reduce((s, sec) => s + sec.fields.filter((f) => f.source === 'Calculated').length, 0);
  const inferred = sections.reduce((s, sec) => s + sec.fields.filter((f) => f.source === 'Inferred').length, 0);
  const manual = sections.reduce((s, sec) => s + sec.fields.filter((f) => f.source === 'Manual').length, 0);

  // Trial filtering
  const filteredTrials = curatedTrials.filter((t) => {
    if (trialFilter === 'all') return true;
    if (trialFilter === 'industry') return t.sponsorType === 'industry';
    const phaseNum = trialFilter.replace('phase-', '');
    return t.phase === phaseNum;
  });

  const selectedTrialData = curatedTrials.find((t) => t.id === selectedTrial) ?? null;

  // ── Registry tab labels ─────────────────────────────────
  const registryTabs: { id: RegistryTab; label: string }[] = [
    { id: 'cathpci', label: 'CathPCI' },
    { id: 'tvt', label: 'TVT' },
    { id: 'icd', label: 'ICD Registry' },
    { id: 'gwtg-hf', label: 'GWTG-HF' },
  ];

  const trialFilterOptions: { id: TrialFilter; label: string }[] = [
    { id: 'all', label: 'All Phases' },
    { id: 'phase-2', label: 'Phase 2' },
    { id: 'phase-3', label: 'Phase 3' },
    { id: 'phase-4', label: 'Phase 4' },
    { id: 'industry', label: 'Industry Sponsored' },
  ];

  // ── Render ──────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* ── Main Tab Bar ──────────────────────────────────── */}
      <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg w-fit">
        {([
          { id: 'registry' as MainTab, label: 'Registry Assist', icon: FileText },
          { id: 'trial-eligibility' as MainTab, label: 'Trial Eligibility', icon: FlaskConical },
        ]).map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              activeTab === tab.id
                ? 'bg-neutral-700 text-white shadow-sm'
                : 'text-slate-600 hover:text-slate-800 hover:bg-slate-200'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 1 -- REGISTRY ASSIST                           */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'registry' && (
        <>
          {/* ── Registry Sub-tabs ───────────────────────────── */}
          <div className="flex items-center gap-2">
            {registryTabs.map((rt) => (
              <button
                key={rt.id}
                onClick={() => {
                  setActiveRegistry(rt.id);
                  setSelectedCase(registryCasesMap[rt.id][0]?.id ?? null);
                }}
                className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  activeRegistry === rt.id
                    ? 'bg-neutral-700 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                {rt.label}
              </button>
            ))}
            <span className="ml-auto text-xs text-slate-400">{cases.length} cases</span>
          </div>

          {/* ── Three-panel grid ────────────────────────────── */}
          <div className="grid grid-cols-12 gap-4">
            {/* ── LEFT: Case List (3 cols) ──────────────────── */}
            <div className="col-span-3 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-3 py-2 bg-slate-50 border-b border-slate-200">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Case Queue</h3>
              </div>
              <div className="max-h-[620px] overflow-y-auto divide-y divide-slate-100">
                {cases.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCase(c.id)}
                    className={`w-full text-left px-3 py-2.5 transition-all hover:bg-slate-50 ${
                      selectedCase === c.id ? 'bg-slate-50 border-l-4 border-l-slate-500' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-slate-800 truncate">{c.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${statusChip(c.status)}`}>
                        {c.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <span>{c.date}</span>
                      <span className="text-slate-300">|</span>
                      <span className="font-medium">{c.type}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-1.5">
                      <div className="flex items-center gap-1">
                        <div className={`w-2 h-2 rounded-full ${completenessColor(c.completeness)}`} />
                        <span className={`text-xs font-semibold ${completenessTextColor(c.completeness)}`}>
                          {c.completeness}%
                        </span>
                      </div>
                      {c.flags > 0 && (
                        <span className="flex items-center gap-0.5 text-xs text-red-600">
                          <AlertTriangle className="w-3 h-3" />
                          {c.flags}
                        </span>
                      )}
                      {c.dtb !== null && (
                        <span className="text-xs text-slate-400">DTB: {c.dtb}m</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* ── CENTER: Registry Form (5 cols) ────────────── */}
            <div className="col-span-5 bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">
                    {currentCase ? currentCase.name : 'Select a case'}
                  </h3>
                  {currentCase && (
                    <span className="text-xs text-slate-500">
                      {currentCase.id} -- {currentCase.type} -- {currentCase.date}
                    </span>
                  )}
                </div>
                {currentCase && (
                  <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${statusChip(currentCase.status)}`}>
                    {currentCase.status}
                  </span>
                )}
              </div>
              <div className="max-h-[580px] overflow-y-auto px-4 py-3 space-y-4">
                {sections.map((sec) => (
                  <div key={sec.title}>
                    <h4 className="text-xs font-bold text-neutral-700 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                      <div className="w-1 h-3.5 bg-neutral-700 rounded-full" />
                      {sec.title}
                    </h4>
                    <div className="space-y-1.5">
                      {sec.fields.map((f) => (
                        <div
                          key={f.label}
                          className={`flex items-center justify-between py-1.5 px-2 rounded-md ${
                            f.confidence < 70 ? 'bg-chrome-50 border border-titanium-300' : 'hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex-1 min-w-0">
                            <span className="text-xs text-slate-500">{f.label}</span>
                            <p className="text-sm font-medium text-slate-800 truncate">{f.value}</p>
                          </div>
                          <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                            <div className={`w-2 h-2 rounded-full ${confidenceDot(f.confidence)}`} title={`${f.confidence}% confidence`} />
                            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded ${sourceChip(f.source)}`}>
                              {f.source}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── RIGHT: Confidence & Flags (4 cols) ────────── */}
            <div className="col-span-4 space-y-4">
              {/* Completeness Summary */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Completeness</h3>
                {currentCase && (
                  <>
                    <div className="flex items-end gap-2 mb-2">
                      <span className={`text-3xl font-bold ${completenessTextColor(currentCase.completeness)}`}>
                        {currentCase.completeness}%
                      </span>
                      <span className="text-xs text-slate-400 mb-1">overall</span>
                    </div>
                    <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden mb-3">
                      <div
                        className={`h-full rounded-full transition-all ${completenessColor(currentCase.completeness)}`}
                        style={{ width: `${currentCase.completeness}%` }}
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="bg-titanium-300 rounded-lg p-2">
                        <div className="text-lg font-bold text-teal-700">{highConf}</div>
                        <div className="text-[10px] text-teal-700">High conf.</div>
                      </div>
                      <div className="bg-chrome-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-gray-500">{needsReview}</div>
                        <div className="text-[10px] text-gray-500">Needs review</div>
                      </div>
                      <div className="bg-red-50 rounded-lg p-2">
                        <div className="text-lg font-bold text-red-700">{missing}</div>
                        <div className="text-[10px] text-red-600">Missing</div>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Flags */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                  Flags ({flags.length})
                </h3>
                {flags.length === 0 ? (
                  <div className="flex items-center gap-2 text-xs text-teal-700 py-2">
                    <CheckCircle className="w-4 h-4" />
                    No flags for this case
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[200px] overflow-y-auto">
                    {flags.map((fl, idx) => (
                      <div key={idx} className="bg-red-50 border border-red-100 rounded-lg p-2.5">
                        <div className="flex items-center gap-1 mb-0.5">
                          <span className="text-xs font-semibold text-red-800">{fl.field}</span>
                          <span className="text-[10px] text-red-500">-- {fl.issue}</span>
                        </div>
                        <p className="text-[11px] text-red-700">{fl.recommendation}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Source Attribution */}
              <div className="bg-white rounded-xl border border-slate-200 p-4">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Source Attribution</h3>
                <div className="space-y-2">
                  {[
                    { label: 'Structured', count: structured, color: 'bg-slate-500', bgColor: 'bg-slate-100' },
                    { label: 'Calculated', count: calculated, color: 'bg-blue-500', bgColor: 'bg-blue-100' },
                    { label: 'Inferred', count: inferred, color: 'bg-chrome-50', bgColor: 'bg-chrome-50' },
                    { label: 'Manual', count: manual, color: 'bg-slate-500', bgColor: 'bg-slate-100' },
                  ].map((s) => (
                    <div key={s.label} className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-sm ${s.color}`} />
                      <span className="text-xs text-slate-600 flex-1">{s.label}</span>
                      <span className="text-xs font-semibold text-slate-800">{s.count}</span>
                      <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.color}`}
                          style={{ width: `${totalFields > 0 ? (s.count / totalFields) * 100 : 0}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2">
                <button className="w-full py-2 bg-neutral-700 text-white text-sm font-semibold rounded-lg hover:bg-[#3B4252] transition-colors flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  Approve & Submit
                </button>
                <button className="w-full py-2 bg-white border border-slate-300 text-slate-700 text-sm font-medium rounded-lg hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                  <AlertTriangle className="w-4 h-4" />
                  Flag for Review
                </button>
                <button className="text-xs text-slate-500 hover:text-slate-700 transition-colors flex items-center justify-center gap-1 py-1">
                  <FileText className="w-3 h-3" />
                  Export CSV
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════ */}
      {/* TAB 2 -- TRIAL ELIGIBILITY                         */}
      {/* ════════════════════════════════════════════════════ */}
      {activeTab === 'trial-eligibility' && (
        <>
          {/* ── Search bar + filter chips ───────────────────── */}
          <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search trials by name, condition, or NCT number..."
                  className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#2E3440]/20 focus:border-[#2E3440]"
                />
              </div>
              <div className="flex items-center gap-1.5 bg-green-50 border border-green-100 rounded-full px-3 py-1.5">
                <div className="w-2 h-2 rounded-full bg-titanium-300 animate-pulse" />
                <span className="text-xs font-medium text-teal-700">Live: ClinicalTrials.gov</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-slate-400" />
              {trialFilterOptions.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setTrialFilter(f.id)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                    trialFilter === f.id
                      ? f.id === 'industry'
                        ? 'bg-amber-50 text-amber-600 ring-1 ring-[#6B7280]'
                        : 'bg-neutral-700 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {f.label}
                </button>
              ))}
              {apiLoading && (
                <span className="ml-auto text-xs text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3 animate-spin" />
                  Loading live trials...
                </span>
              )}
              {apiError && (
                <span className="ml-auto text-xs text-gray-500">
                  Live search temporarily unavailable -- showing curated trials
                </span>
              )}
            </div>
          </div>

          {/* ── Two-panel layout ────────────────────────────── */}
          <div className="grid grid-cols-2 gap-4">
            {/* ── LEFT: Trial List ──────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Curated Trials ({filteredTrials.length})
                </h3>
              </div>
              <div className="max-h-[540px] overflow-y-auto divide-y divide-slate-100">
                {filteredTrials.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTrial(t.id)}
                    className={`w-full text-left px-4 py-3 transition-all hover:bg-slate-50 ${
                      selectedTrial === t.id ? 'bg-slate-50 border-l-4 border-l-[#2E3440]' : 'border-l-4 border-l-transparent'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <span className="text-sm font-medium text-slate-800 leading-tight">{t.name}</span>
                      <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${sponsorBadge(t.sponsorType)}`}>
                        {sponsorLabel(t.sponsorType)}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs mt-1">
                      <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-medium">
                        {t.phase === 'Registry' ? 'Registry' : `Phase ${t.phase}`}
                      </span>
                      <span className={`px-1.5 py-0.5 rounded font-medium ${
                        t.status === 'Enrolling' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {t.status}
                      </span>
                      <span className="text-slate-400">|</span>
                      <span className="text-slate-600">
                        <Users className="w-3 h-3 inline mr-0.5" />
                        {t.eligiblePatients} eligible
                      </span>
                      <span className="ml-auto text-blue-600 font-medium hover:underline">{t.gapRef}</span>
                    </div>
                  </button>
                ))}

                {/* API Trials */}
                {apiTrials.length > 0 && (
                  <>
                    <div className="px-4 py-2 bg-chrome-50 border-y border-chrome-50">
                      <span className="text-[10px] font-semibold text-teal-700 uppercase tracking-wider">
                        Live from ClinicalTrials.gov
                      </span>
                    </div>
                    {apiTrials.map((t) => (
                      <div key={t.id} className="w-full text-left px-4 py-3 border-l-4 border-l-transparent hover:bg-chrome-50/30">
                        <div className="flex items-start justify-between gap-2 mb-1">
                          <span className="text-sm font-medium text-slate-800 leading-tight">{t.name}</span>
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full whitespace-nowrap ${sponsorBadge(t.sponsorType)}`}>
                            {sponsorLabel(t.sponsorType)}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-xs mt-1">
                          <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">{t.phase}</span>
                          <span className="bg-green-50 text-green-600 px-1.5 py-0.5 rounded font-medium">{t.status}</span>
                          <span className="text-slate-400">{t.nct}</span>
                        </div>
                        <div className="mt-1 text-[10px] text-slate-500 truncate">
                          {t.conditions.join(', ')}
                        </div>
                      </div>
                    ))}
                  </>
                )}
              </div>
            </div>

            {/* ── RIGHT: Trial Detail Card ──────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              {!selectedTrialData ? (
                <div className="flex flex-col items-center justify-center h-full py-20 text-slate-400">
                  <FlaskConical className="w-10 h-10 mb-3 text-slate-300" />
                  <p className="text-sm">Select a trial to view details</p>
                </div>
              ) : (
                <div className="overflow-y-auto max-h-[600px]">
                  {/* Industry warning banner */}
                  {selectedTrialData.sponsorType === 'industry' && (
                    <div className="bg-chrome-50 border-b border-titanium-300 px-4 py-2.5 flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-gray-500 flex-shrink-0 mt-0.5" />
                      <p className="text-xs text-gray-500">
                        <span className="font-semibold">Industry-Sponsored Trial</span> -- Enrollment discussions require PI approval before patient contact. Research compliance office notification required.
                      </p>
                    </div>
                  )}

                  <div className="p-4 space-y-4">
                    {/* Header */}
                    <div>
                      <h3 className="text-base font-bold text-slate-800 mb-1">{selectedTrialData.name}</h3>
                      <div className="flex items-center gap-2">
                        <a
                          href={selectedTrialData.nct.startsWith('NCT') ? `https://clinicaltrials.gov/study/${selectedTrialData.nct}` : '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          {selectedTrialData.nct}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>

                    {/* Badges row */}
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full text-xs font-semibold">
                        {selectedTrialData.phase === 'Registry' ? 'Registry' : `Phase ${selectedTrialData.phase}`}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${
                        selectedTrialData.status === 'Enrolling' ? 'bg-green-50 text-green-600' : 'bg-amber-50 text-amber-600'
                      }`}>
                        {selectedTrialData.status}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${sponsorBadge(selectedTrialData.sponsorType)}`}>
                        {selectedTrialData.sponsor}
                      </span>
                    </div>

                    {/* Inclusion criteria */}
                    <div>
                      <h4 className="text-xs font-bold text-teal-700 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <CheckCircle className="w-3.5 h-3.5" />
                        Inclusion Criteria
                      </h4>
                      <ul className="space-y-1">
                        {selectedTrialData.inclusion.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                            <ChevronRight className="w-3 h-3 text-teal-700 flex-shrink-0 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Exclusion criteria */}
                    <div>
                      <h4 className="text-xs font-bold text-red-800 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Shield className="w-3.5 h-3.5" />
                        Exclusion Criteria
                      </h4>
                      <ul className="space-y-1">
                        {selectedTrialData.exclusion.map((c, i) => (
                          <li key={i} className="flex items-start gap-1.5 text-xs text-slate-700">
                            <ChevronRight className="w-3 h-3 text-red-500 flex-shrink-0 mt-0.5" />
                            {c}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Eligible patients box */}
                    <div className="bg-neutral-700/5 border border-[#2E3440]/10 rounded-lg p-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <span className="text-xs text-slate-500">Eligible patients in your population</span>
                          <div className="text-2xl font-bold text-neutral-700">{selectedTrialData.eligiblePatients}</div>
                        </div>
                        <Users className="w-8 h-8 text-neutral-700/30" />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Based on EHR-matched inclusion/exclusion criteria across active patient panel
                      </p>
                    </div>

                    {/* Gap link */}
                    <button className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors">
                      <ChevronRight className="w-4 h-4" />
                      See {selectedTrialData.gapName} ({selectedTrialData.gapRef})
                    </button>

                    {/* PI info */}
                    {trialPIs[selectedTrialData.id] && (
                      <div className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                        <span className="text-[10px] text-slate-500 uppercase tracking-wider font-semibold">Principal Investigator</span>
                        <p className="text-sm font-semibold text-slate-800 mt-0.5">{trialPIs[selectedTrialData.id].name}</p>
                        <p className="text-xs text-slate-500">{trialPIs[selectedTrialData.id].dept}</p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ResearchServiceLineView;
