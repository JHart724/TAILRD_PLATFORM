/**
 * Cardiovascular Terminology Valuesets
 *
 * Curated code sets for gap detection rules. Each valueset maps to a clinical
 * concept used by one or more gap rules. Sources: LOINC 2.76, RxNorm 2024-01,
 * ICD-10-CM 2024, SNOMED CT 20240101.
 *
 * These are referenced by gapDetectionRunner.ts and the CQL engine.
 * When adding new gap rules, add the required codes here.
 */

// ── ICD-10-CM Diagnosis Code Sets ────────────────────────────────────────────

/** Heart failure (I50.*) -- used by HF gap rules */
export const ICD10_HEART_FAILURE = [
  'I50', 'I50.1', 'I50.20', 'I50.21', 'I50.22', 'I50.23',
  'I50.30', 'I50.31', 'I50.32', 'I50.33',
  'I50.40', 'I50.41', 'I50.42', 'I50.43',
  'I50.810', 'I50.811', 'I50.812', 'I50.813', 'I50.814',
  'I50.82', 'I50.83', 'I50.84', 'I50.89', 'I50.9',
] as const;

/** Atrial fibrillation/flutter (I48.*) -- used by EP gap rules */
export const ICD10_ATRIAL_FIBRILLATION = [
  'I48', 'I48.0', 'I48.1', 'I48.11', 'I48.19', 'I48.20', 'I48.21',
  'I48.2', 'I48.3', 'I48.4', 'I48.91', 'I48.92',
] as const;

/** Coronary artery disease (I25.*) -- used by coronary gap rules */
export const ICD10_CAD = [
  'I25', 'I25.1', 'I25.10', 'I25.110', 'I25.111', 'I25.118', 'I25.119',
  'I25.2', 'I25.3', 'I25.41', 'I25.42',
  'I25.5', 'I25.6', 'I25.700', 'I25.701', 'I25.708', 'I25.709',
  'I25.710', 'I25.711', 'I25.718', 'I25.719',
  'I25.750', 'I25.751', 'I25.758', 'I25.759',
  'I25.810', 'I25.811', 'I25.812',
  'I25.82', 'I25.83', 'I25.84', 'I25.89', 'I25.9',
] as const;

/** Stent presence (Z95.5) -- used by DAPT gap rule */
export const ICD10_STENT = ['Z95.5'] as const;

/** Type 2 diabetes (E11.*) -- used by finerenone gap rule */
export const ICD10_TYPE2_DIABETES = [
  'E11', 'E11.0', 'E11.00', 'E11.01',
  'E11.1', 'E11.10', 'E11.11',
  'E11.2', 'E11.21', 'E11.22', 'E11.29',
  'E11.3', 'E11.31', 'E11.311', 'E11.319', 'E11.32', 'E11.321', 'E11.329',
  'E11.33', 'E11.331', 'E11.339', 'E11.34', 'E11.341', 'E11.349',
  'E11.35', 'E11.351', 'E11.352', 'E11.353', 'E11.354', 'E11.355', 'E11.359',
  'E11.36', 'E11.37', 'E11.39',
  'E11.4', 'E11.40', 'E11.41', 'E11.42', 'E11.43', 'E11.44', 'E11.49',
  'E11.5', 'E11.51', 'E11.52', 'E11.59',
  'E11.6', 'E11.61', 'E11.610', 'E11.618',
  'E11.62', 'E11.620', 'E11.621', 'E11.622', 'E11.628', 'E11.630', 'E11.638',
  'E11.64', 'E11.641', 'E11.649', 'E11.65', 'E11.69',
  'E11.8', 'E11.9',
] as const;

/** Cardiac amyloidosis -- used by ATTR-CM gap rule */
export const ICD10_CARDIAC_AMYLOIDOSIS = [
  'E85.4',   // Primary (AL) amyloidosis
  'E85.81',  // Light chain (AL) amyloidosis
  'E85.82',  // Wild-type transthyretin amyloidosis (ATTRwt)
  'E85.1',   // Hereditary transthyretin amyloidosis (ATTRv)
] as const;

// ── LOINC Lab Codes ──────────────────────────────────────────────────────────

/** Lab observation LOINC codes relevant to cardiovascular gap detection */
export const LOINC_CARDIOVASCULAR_LABS = {
  // Cardiac biomarkers
  NT_PROBNP: '33762-6',         // Natriuretic peptide.B prohormone N-Terminal
  BNP: '30934-4',               // Natriuretic peptide.B
  HS_TROPONIN_T: '67151-1',     // Troponin T cardiac high sensitivity
  HS_TROPONIN_I: '48641-3',     // Troponin I cardiac high sensitivity
  DIGOXIN_LEVEL: '10535-3',     // Digoxin

  // Renal
  EGFR: '33914-3',              // eGFR (CKD-EPI)
  CREATININE: '2160-0',         // Creatinine serum
  BUN: '3094-0',                // Urea nitrogen

  // Iron studies
  FERRITIN: '2276-4',           // Ferritin
  TSAT: '2502-3',               // Transferrin saturation
  IRON: '2498-4',               // Iron serum
  TIBC: '2500-7',               // Total iron binding capacity

  // Electrolytes
  POTASSIUM: '2823-3',          // Potassium serum
  SODIUM: '2951-2',             // Sodium serum
  MAGNESIUM: '19123-9',         // Magnesium serum
  CALCIUM: '17861-6',           // Calcium serum

  // Lipids
  LDL: '2089-1',                // LDL cholesterol
  HDL: '2085-9',                // HDL cholesterol
  TOTAL_CHOLESTEROL: '2093-3',  // Total cholesterol
  TRIGLYCERIDES: '2571-8',      // Triglycerides
  LPA: '10835-7',               // Lipoprotein(a)

  // Cardiac function
  LVEF: '10230-1',              // Left ventricular ejection fraction
  QTC_INTERVAL: '8636-3',       // QTc interval
  QRS_DURATION: '8632-2',       // QRS duration

  // Other
  HEMOGLOBIN: '718-7',          // Hemoglobin
  HBA1C: '4548-4',              // Hemoglobin A1c
  INR: '6301-6',                // INR
  ABI_RIGHT: '44974-4',        // ABI right
  ABI_LEFT: '44975-1',         // ABI left
} as const;

// ── RxNorm Medication Codes ──────────────────────────────────────────────────

/** P2Y12 inhibitors -- used by DAPT gap rule */
export const RXNORM_P2Y12_INHIBITORS = {
  CLOPIDOGREL: '32968',
  PRASUGREL: '613391',
  TICAGRELOR: '1116632',
} as const;

/** Digoxin formulations -- used by digoxin toxicity gap rule */
export const RXNORM_DIGOXIN = {
  DIGOXIN_125MCG: '197604',
  DIGOXIN_250MCG: '197605',
  DIGOXIN_ELIXIR: '197606',
  DIGOXIN_IV: '197607',
} as const;

/** Finerenone -- used by finerenone gap rule */
export const RXNORM_FINERENONE = {
  FINERENONE_10MG: '2481926',
  FINERENONE_20MG: '2481928',
} as const;

/** GDMT medications -- used by HF GDMT optimization */
export const RXNORM_GDMT = {
  // ACE inhibitors
  LISINOPRIL: '29046',
  ENALAPRIL: '3827',
  RAMIPRIL: '35296',
  // ARBs
  LOSARTAN: '52175',
  VALSARTAN: '69749',
  CANDESARTAN: '214354',
  // ARNI
  SACUBITRIL_VALSARTAN: '1656339',
  // Beta-blockers (evidence-based for HF)
  CARVEDILOL: '20352',
  METOPROLOL_SUCCINATE: '6918',
  BISOPROLOL: '19484',
  // MRAs
  SPIRONOLACTONE: '9997',
  EPLERENONE: '298869',
  // SGLT2 inhibitors
  DAPAGLIFLOZIN: '1488564',
  EMPAGLIFLOZIN: '1545653',
  SOTAGLIFLOZIN: '2627044',
  // Hydralazine/Isosorbide dinitrate
  HYDRALAZINE: '5470',
  ISOSORBIDE_DINITRATE: '6058',
  // Ivabradine
  IVABRADINE: '1649480',
} as const;

/** QT-prolonging medications -- used by QTc safety gap rule */
export const RXNORM_QT_PROLONGING = {
  AMIODARONE: '703',
  SOTALOL: '9947',
  DOFETILIDE: '135447',
  DRONEDARONE: '997221',
  FLECAINIDE: '4441',
  PROCAINAMIDE: '8787',
  QUINIDINE: '9068',
  HALOPERIDOL: '5093',
  METHADONE: '6813',
  ERYTHROMYCIN: '4053',
  AZITHROMYCIN: '18631',
  CIPROFLOXACIN: '2551',
  LEVOFLOXACIN: '82122',
  MOXIFLOXACIN: '139462',
  ONDANSETRON: '26225',
} as const;

/** Aspirin -- used by DAPT gap rule */
export const RXNORM_ASPIRIN = {
  ASPIRIN: '1191',
  ASPIRIN_81MG: '198464',
  ASPIRIN_325MG: '198467',
} as const;
