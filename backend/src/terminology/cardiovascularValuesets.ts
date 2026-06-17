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

/** Cardiac amyloidosis -- used by ATTR-CM gap rule.
 *  Fix (Batch 3 minor, 2026-05-06): E85.4 comment-precision fix per ICD-10-CM 2024 — E85.4 is
 *  "Organ-limited amyloidosis", NOT "Primary (AL) amyloidosis". Real AL amyloidosis is E85.81
 *  (Light chain) which is also in this set, so coverage is unchanged; only the comment was
 *  inaccurate. E85.1 is "Neuropathic heredofamilial amyloidosis" per ICD-10-CM (ATTRv may
 *  present neuropathic OR cardiac; either E85.1 or E85.2 may apply per phenotype). */
export const ICD10_CARDIAC_AMYLOIDOSIS = [
  'E85.4',   // Organ-limited amyloidosis (per ICD-10-CM 2024; NOT "Primary AL" — real AL is E85.81)
  'E85.81',  // Light chain (AL) amyloidosis
  'E85.82',  // Wild-type transthyretin amyloidosis (ATTRwt)
  'E85.1',   // Neuropathic heredofamilial amyloidosis (per ICD-10-CM 2024; covers ATTRv neuropathic phenotype)
] as const;

/** Aortic stenosis (I35.0) -- used by structural heart gap rules */
export const ICD10_AORTIC_STENOSIS = [
  'I35.0',   // Nonrheumatic aortic (valve) stenosis
  'I35.2',   // Nonrheumatic aortic (valve) stenosis with insufficiency
  'I06.0',   // Rheumatic aortic stenosis
  'I06.2',   // Rheumatic aortic stenosis with insufficiency
  'Q23.0',   // Congenital stenosis of aortic valve
] as const;

/** Mechanical heart valve presence -- used by valvular anticoag gap rule */
export const ICD10_MECHANICAL_VALVE = [
  'Z95.2',   // Presence of prosthetic heart valve
  'Z95.3',   // Presence of xenogenic heart valve
  'Z95.4',   // Presence of other heart valve replacement
] as const;

/** Peripheral artery disease -- used by PV gap rules */
export const ICD10_PAD = [
  'I73.9',   // Peripheral vascular disease, unspecified
  'I70.20',  // Atherosclerosis of native arteries of extremities, unspecified
  'I70.21',  // Atherosclerosis of native arteries with intermittent claudication
  'I70.22',  // Atherosclerosis of native arteries with rest pain
  'I70.23',  // Atherosclerosis of native arteries with ulceration
  'I70.24',  // Atherosclerosis of native arteries with gangrene
  'I70.25',  // Atherosclerosis of native arteries, other
  'I70.29',  // Other atherosclerosis of native arteries of extremities
] as const;

// ── LOINC Lab Codes ──────────────────────────────────────────────────────────

/** Lab observation LOINC codes relevant to cardiovascular gap detection */
export const LOINC_CARDIOVASCULAR_LABS = {
  // Cardiac biomarkers
  NT_PROBNP: '33762-6',         // Natriuretic peptide.B prohormone N-Terminal
  BNP: '30934-4',               // Natriuretic peptide.B
  HS_TROPONIN_T: '67151-1',     // Troponin T cardiac high sensitivity
  HS_TROPONIN_I: '89579-7',     // Troponin I cardiac high sensitivity (was 48641-3 = conventional TnI)
  DIGOXIN_LEVEL: '10535-3',     // Digoxin

  // Renal
  EGFR: '62238-1',              // eGFR CKD-EPI 2021 (was 33914-3 = MDRD). Both accepted in observationService.
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
  // Fix (AUDIT-065, 2026-05-06): QTC_INTERVAL was 8601-7 = "EKG impression" (a free-text concept,
  //   NOT QTc). QTc safety rule was monitoring wrong LOINC concept. Real QTc corrected = 8636-3
  //   (verified loinc.org). Same wrong-concept-mapped-to-right-name pattern as Cat A RxNorm bugs.
  // Fix (AUDIT-066, 2026-05-06): QRS_DURATION was 8632-2 = "QRS axis" (degrees, e.g., 60°), NOT
  //   QRS duration (ms, e.g., 150ms). CRT eligibility rule (LVEF≤35 + QRS>150) was reading axis as
  //   if duration; threshold >150 effectively never triggered (axis range -30 to +120). Real QRS
  //   duration = 8633-0 (verified loinc.org).
  // Fix (AUDIT-069, 2026-05-06): LVEF was 18010-0 — unverifiable per NLM Clinical Tables (search
  //   returns empty; loinc.org direct returns 500); not present in NLM LVEF concept set. Real
  //   canonical LVEF = 10230-1 ("Left ventricular Ejection fraction" verified loinc.org direct).
  //   Prior codebase comment "(was 10230-1 = QRS duration — WRONG)" was a regression: 10230-1 is
  //   LVEF per loinc.org and NLM Clinical Tables; the prior "fix" replaced the correct code with
  //   an unverifiable one. Every HF rule reading labValues['lvef'] depended on this mapping.
  LVEF: '10230-1',              // Left ventricular Ejection fraction (verified loinc.org + NLM; was 18010-0 = unverifiable)
  QTC_INTERVAL: '8636-3',       // Q-T interval corrected (verified loinc.org; was 8601-7 = "EKG impression")
  QRS_DURATION: '8633-0',       // QRS duration (verified loinc.org; was 8632-2 = "QRS axis")

  // Other
  HEMOGLOBIN: '718-7',          // Hemoglobin
  HBA1C: '4548-4',              // Hemoglobin A1c
  INR: '6301-6',                // INR
  // Fix (AUDIT-067/068, 2026-05-06): canonical LOINC corrected to 77194-9 ("Ankle-brachial index"
  //   verified loinc.org direct + NLM Clinical Tables). Was 44974-4 = "Pulse intensity of unspecified
  //   artery palpation" (wrong concept) and 44975-1 = "Q-T interval" (an EKG concept!).
  //
  // Architectural note (per §17.1 consumer audit, 2026-05-06): these LOINC entries are CURRENTLY
  //   REFERENCE-ONLY — they are declared in the canonical valueset but NOT consumed by any active
  //   runtime path. CSV ingestion (`patientWriter.ts:91`) writes `observationType='abi_right'` /
  //   `'abi_left'` directly from CSV column names, bypassing LOINC entirely. FHIR ingestion
  //   (`observationService.ts CARDIOVASCULAR_LAB_CODES`) does not currently include ABI mappings,
  //   so FHIR-ingested ABI observations don't reach the rule (latent gap tracked as AUDIT-070).
  //   The PAD screening rule (`gapRuleEngine.ts:4891`) reads `labValues['abi_right']` /
  //   `labValues['abi_left']` keyed by ingestion-side `observationType`, not by LOINC.
  //
  // LOINC has NO side-specific codes for ABI — both keys map to the same canonical 77194-9. When
  //   FHIR ABI ingestion is added (AUDIT-070 dedicated PR), side discrimination will require
  //   FHIR `bodySite` extension handling: the same LOINC 77194-9 + bodySite=lower-extremity-right
  //   → `observationType='abi_right'`; bodySite=lower-extremity-left → `observationType='abi_left'`.
  ABI_RIGHT: '77194-9',         // Ankle-brachial index (LOINC 77194-9; reference-only — see JSDoc above)
  ABI_LEFT: '77194-9',          // Ankle-brachial index (LOINC 77194-9; reference-only — same code; side via FHIR bodySite when FHIR ingestion enabled per AUDIT-070)
} as const;

// ── RxNorm Medication Codes ──────────────────────────────────────────────────

/** P2Y12 inhibitors -- used by DAPT gap rule */
export const RXNORM_P2Y12_INHIBITORS = {
  CLOPIDOGREL: '32968',
  PRASUGREL: '613391',
  TICAGRELOR: '1116632',
} as const;

/** Digoxin formulations -- used by digoxin toxicity gap rule.
 *  AUDIT-044 (2026-05-05): removed DIGOXIN_IV (197607) — that CUI is a retired
 *    aspirin/caffeine/dihydrocodeine combo product, NOT digoxin (RxNav historystatus=NotCurrent).
 *  AUDIT-045: relabeled 197605 (was DIGOXIN_250MCG, actually 0.2mg cap) and added
 *    DIGOXIN_INGREDIENT (3407) so the toxicity rule catches any digoxin formulation.
 *  All current codes verified via RxNav properties.json. */
export const RXNORM_DIGOXIN = {
  DIGOXIN_INGREDIENT: '3407',  // digoxin (ingredient code — covers all formulations)
  DIGOXIN_125MCG: '197604',    // digoxin 0.125 MG Oral Tablet
  DIGOXIN_0_2MG_CAP: '197605', // digoxin 0.2 MG Oral Capsule (was mislabeled DIGOXIN_250MCG)
  DIGOXIN_250MCG: '197606',    // digoxin 0.25 MG Oral Tablet (was mislabeled DIGOXIN_ELIXIR)
} as const;

/** Finerenone -- used by finerenone gap rule.
 *  AUDIT-053 (2026-05-05): replaced 2481926/2481928 (UNKNOWN status in RxNorm — invalid CUIs;
 *    rule never fired in production) with 2562811 (verified finerenone ingredient via RxNav). */
export const RXNORM_FINERENONE = {
  FINERENONE: '2562811',  // finerenone (ingredient — covers all formulations)
} as const;

/** ATTR-CM disease-modifying therapy (GAP-HF-054). All ingredient (TTY=IN), RxNav-verified 2026-06-15.
 *  Source: RxNav rxcui.json?name=. tafamidis 1545063, acoramidis 2698312, vutrisiran 2604578.
 *  Operator clinical ruling 2026-06-15: patisiran (2053490) DROPPED - polyneuropathy-indicated,
 *  not ATTR-CM (APOLLO-B not approved for CM). v3.0 HF buildout (calibration sample). */
export const RXNORM_ATTR_DMT = {
  TAFAMIDIS: '1545063',
  ACORAMIDIS: '2698312',
  VUTRISIRAN: '2604578',
} as const;

/** Colchicine (GAP-HF-143 recurrent pericarditis). Ingredient (TTY=IN), RxNav-verified 2026-06-15. */
export const RXNORM_COLCHICINE = {
  COLCHICINE: '2683',
} as const;

/** IV iron formulations (GAP-HF-033 absolute iron deficiency). All ingredient (TTY=IN),
 *  RxNav-verified 2026-06-15: ferric carboxymaltose 1433693, iron sucrose 24909,
 *  ferric derisomaltose 2274394. */
export const RXNORM_IV_IRON = {
  FERRIC_CARBOXYMALTOSE: '1433693',
  IRON_SUCROSE: '24909',
  FERRIC_DERISOMALTOSE: '2274394',
} as const;

/** Non-evidence-based beta-blockers in HFrEF (GAP-HF-002). Ingredient (TTY=IN),
 *  RxNav-verified 2026-06-15: atenolol 1202. Operator clinical ruling 2026-06-15: nebivolol
 *  (31555) DROPPED - SENIORS-trial evidence in elderly HF makes it too defensible to flag as an
 *  error. NOTE: metoprolol tartrate cannot be distinguished from metoprolol succinate at
 *  ingredient level (both = metoprolol IN 6918) - tartrate-specific detection requires the
 *  product/name path (AUDIT-101 precedent), so this set covers atenolol only (data-limit). */
export const RXNORM_NON_EBM_BB_HF = {
  ATENOLOL: '1202',
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
  SOTAGLIFLOZIN: '2638675',  // AUDIT-054 (2026-05-05): was 2627044 = bexagliflozin (wrong drug)
  // Hydralazine/Isosorbide dinitrate
  HYDRALAZINE: '5470',
  ISOSORBIDE_DINITRATE: '6058',
  // Ivabradine
  IVABRADINE: '1649480',  // AUDIT-055 (2026-05-05): was 1649380 = invalid CUI (UNKNOWN status, rule never fired)
} as const;

/** GLP-1 receptor agonists -- used by HF-7 (GLP-1 RA for HFpEF with obesity) and
 *  gap-cad-glp1 (GLP-1 RA in CAD + T2DM).
 *  AUDIT-104 (2026-06-01): first canonical-valueset instance realizing the AUDIT-052 pattern.
 *    Both gates previously carried inline arrays gating on the dead semaglutide CUI 2551758
 *    (UNKNOWN in RxNorm) and dulaglutide 1803932 (= leucovorin); HF-7 additionally omitted
 *    dulaglutide entirely. Canonicalized here so both gates resolve through one verified set.
 *    Union membership {sema, lira, dula} per operator clinical-logic decision 2026-06-01:
 *    HF-7's detection set expands to include dulaglutide (a valid GLP-1 RA; a patient on it
 *    should suppress the gap), correcting a latent narrow-set over-fire.
 *    All codes RxNav properties.json-verified (IN tty) 2026-06-01. Do NOT source from the dead
 *    rxnorm.ts DRUG_CLASSES (AUDIT-105). */
export const RXNORM_GLP1_RA = {
  SEMAGLUTIDE: '1991302',  // AUDIT-104 (was 2551758 = UNKNOWN/invalid CUI)
  LIRAGLUTIDE: '475968',
  DULAGLUTIDE: '1551291',  // AUDIT-104 (was 1803932 = leucovorin; newly added to HF-7 per approved union membership)
} as const;

/** QT-prolonging medications -- used by QTc safety gap rule.
 *  AUDIT-042 (2026-05-05): PROCAINAMIDE corrected 8787 → 8700 (8787 = propranolol, NOT procainamide).
 *  AUDIT-056: DOFETILIDE corrected 135447 → 49247 (135447 = donepezil, an Alzheimer's drug, NOT dofetilide).
 *  AUDIT-057: DRONEDARONE corrected 997221 → 233698 (997221 = donepezil branded).
 *  AUDIT-052 partial mitigation (2026-05-06): added PROPAFENONE (8754, RxNav-verified) so AAD detection
 *    inline arrays can import from canonical instead of redeclaring.
 *  All current codes verified via RxNav properties.json. */
export const RXNORM_QT_PROLONGING = {
  AMIODARONE: '703',
  SOTALOL: '9947',
  DOFETILIDE: '49247',     // AUDIT-056 (was 135447 = donepezil)
  DRONEDARONE: '233698',   // AUDIT-057 (was 997221 = donepezil branded)
  FLECAINIDE: '4441',
  PROPAFENONE: '8754',     // AUDIT-052 partial (canonical promotion 2026-05-06; verified RxNav)
  PROCAINAMIDE: '8700',    // AUDIT-042 (was 8787 = propranolol)
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

/** Aspirin -- used by DAPT gap rule.
 *  AUDIT-058 (2026-05-05): ASPIRIN_81MG corrected 198464 → 243670
 *    (198464 = aspirin 300 MG Rectal Suppository, NOT 81mg oral). */
export const RXNORM_ASPIRIN = {
  ASPIRIN: '1191',
  ASPIRIN_81MG: '243670',   // AUDIT-058 (was 198464 = 300mg rectal suppository)
  ASPIRIN_325MG: '198467',  // aspirin 325 MG Delayed Release Oral Tablet
} as const;

/** DOACs -- used by AFib anticoagulation gap rule */
export const RXNORM_DOACS = {
  APIXABAN: '1364430',
  RIVAROXABAN: '1114195',
  EDOXABAN: '1599538',
  // AUDIT-117/AUDIT-118 (2026-06-14): was '1037045' = dabigatran etexilate 150 MG
  // Oral Capsule (TTY=SCD), which matched ONLY the 150mg product and missed the
  // 75mg renal-impairment dose. '1037042' is the dabigatran ingredient (TTY=IN,
  // RxNav-verified); with expandToIngredients() every dabigatran product rolls up
  // to it. Consumed by DOAC_CODES_CV / OAC_CODES_CV in gapRuleEngine.ts.
  DABIGATRAN: '1037042',
} as const;

/** Warfarin -- used by mechanical valve anticoagulation gap rule.
 *  AUDIT-059/060/061 (2026-05-05): warfarin formulation labels corrected — codes were valid
 *    warfarin but mislabeled to wrong strengths. Real strengths verified via RxNav:
 *    855288=1mg ✓, 855302=2mg (added; previously missing), 855318=3mg (was labeled 5MG),
 *    855332=5mg (was labeled 10MG), 855296=10mg (was labeled 2MG). */
export const RXNORM_WARFARIN = {
  WARFARIN: '11289',         // warfarin (ingredient)
  WARFARIN_1MG: '855288',    // warfarin sodium 1 MG Oral Tablet
  WARFARIN_2MG: '855302',    // AUDIT-059 (added; replaces wrong 855296=10mg)
  WARFARIN_3MG: '855318',    // AUDIT-060 (relabeled from WARFARIN_5MG; 855318 is actually 3mg)
  WARFARIN_5MG: '855332',    // AUDIT-061 (relabeled from WARFARIN_10MG; 855332 is actually 5mg)
  WARFARIN_10MG: '855296',   // AUDIT-059 (relabeled from WARFARIN_2MG; 855296 is actually 10mg)
} as const;

/** Rate control agents (BB + CCB) -- used by AFib rate control gap rule */
export const RXNORM_RATE_CONTROL = {
  METOPROLOL: '6918',
  CARVEDILOL: '20352',
  DILTIAZEM: '3443',
  VERAPAMIL: '11170',
} as const;

/**
 * EP catheter-ablation CPT codes -- used by the v3.0 EP rhythm/ablation gap rules (chunk 2).
 * These match the patient's threaded procedureCodes (PR #396) to detect prior ablation (presence)
 * or its absence (an unoffered-ablation gap).
 *
 * CPT VERIFICATION (AUDIT_METHODOLOGY.md section 16 - CPT source is AMA CPT, NOT RxNav):
 *   Verified 2026-06-16 against AMA CPT Assistant (Dec 2021, "Reporting Cardiac Ablation 93653/93654/93656"),
 *   AAPC Codify, and ACC "New 2022 Cardiovascular CPT Codes". 2022 descriptor revision bundles add-ons.
 *   93653 = comprehensive EP study with ablation of SUPRAVENTRICULAR tachycardia (fast/slow AV-nodal pathway,
 *           accessory AV connection, cavo-tricuspid isthmus, or other single atrial focus / atrial re-entry).
 *           Covers AVNRT, AVRT, typical atrial flutter (CTI), and focal atrial tachycardia.
 *   93654 = comprehensive EP study with ablation of VENTRICULAR tachycardia / ventricular ectopy focus.
 *   93656 = comprehensive EP study with ablation of ATRIAL FIBRILLATION by pulmonary vein isolation (PVI).
 *           NOTE per AMA: 93653 is not reported in conjunction with 93656.
 */
export const EP_ABLATION_CPT = {
  SVT: '93653',   // SVT/AVNRT/AVRT/typical-flutter(CTI)/focal-AT ablation
  VT: '93654',    // ventricular tachycardia ablation
  AF_PVI: '93656', // atrial fibrillation ablation by pulmonary vein isolation
} as const;

/**
 * CIED (cardiac implantable electronic device) implant CPT codes -- v3.0 EP buildout chunk 3.
 * Matched against threaded procedureCodes (PR #396) to detect device presence/absence.
 * CPT VERIFICATION (section 16 - AMA CPT, not RxNav): verified 2026-06-16 against CMS coverage articles
 *   (A54929/A54931), AAPC Codify, and Medtronic/Philips coding guides.
 *   33206 = permanent pacemaker, transvenous, ATRIAL (single-chamber).
 *   33207 = permanent pacemaker, transvenous, VENTRICULAR (single-chamber).
 *   33208 = permanent pacemaker, transvenous, ATRIAL + VENTRICULAR (dual-chamber).
 *   33249 = insertion/replacement of permanent ICD with transvenous lead(s) (single or dual chamber).
 *   33270 = insertion/replacement of permanent SUBCUTANEOUS ICD (S-ICD) system.
 *   33274 = transcatheter insertion/replacement of permanent LEADLESS pacemaker (right ventricular).
 */
export const CIED_IMPLANT_CPT = {
  PACEMAKER_ATRIAL: '33206',
  PACEMAKER_VENTRICULAR: '33207',
  PACEMAKER_DUAL: '33208',
  ICD: '33249',
  SICD: '33270',
  LEADLESS_PACEMAKER: '33274',
} as const;

/**
 * CIED extraction/removal CPT codes -- v3.0 EP buildout chunk 3 (used for the CIED-infection
 * full-system-extraction gap; absence of an extraction code = extraction not yet performed).
 * CPT VERIFICATION (section 16 - AMA CPT): verified 2026-06-16 against AAPC Codify + Medtronic coding scenarios.
 *   33244 = removal of single/dual-chamber ICD ELECTRODE(s) by transvenous extraction.
 *   33241 = removal of ICD pulse generator only.
 *   33234 = removal of pacemaker ELECTRODE, single-lead system.
 *   33235 = removal of pacemaker ELECTRODE, dual-lead system.
 */
export const CIED_EXTRACTION_CPT = {
  ICD_LEAD_EXTRACTION: '33244',
  ICD_GENERATOR_REMOVAL: '33241',
  PACEMAKER_LEAD_REMOVAL_SINGLE: '33234',
  PACEMAKER_LEAD_REMOVAL_DUAL: '33235',
} as const;

/** Bioprosthetic valve presence -- used by echo surveillance gap rule */
export const ICD10_BIOPROSTHETIC_VALVE = [
  'Z95.2',   // Presence of prosthetic heart valve
  'Z95.4',   // Presence of other heart valve replacement
] as const;

/** Dihydropyridine calcium channel blockers (DHP CCBs).
 *  AUDIT-052 partial mitigation (2026-05-06): canonical valueset created so inline arrays
 *  CCB_CODES_RAN, CCB_CODES_VASOSP, CCB_CODES_RAYNAUD can import from canonical instead of
 *  redeclaring. Distinct from non-DHP CCBs (diltiazem, verapamil) which live in RXNORM_RATE_CONTROL
 *  because of their AVN-blocking effect (relevant for AFib rate control + WPW SAFETY rules).
 *  All codes RxNav-verified per AUDIT_METHODOLOGY.md §16. */
export const RXNORM_DHP_CCB = {
  AMLODIPINE: '17767',
  NIFEDIPINE: '7417',
  ISRADIPINE: '33910',
  FELODIPINE: '4316',
  NICARDIPINE: '7396',
} as const;

/** Proton pump inhibitors (PPIs).
 *  AUDIT-052 partial mitigation (2026-05-06): canonical valueset created so inline arrays
 *  (currently PPI_CODES_DAPT) can import from canonical instead of redeclaring.
 *  All 5 standard PPIs included; all RxNav-verified per AUDIT_METHODOLOGY.md §16. */
export const RXNORM_PPI = {
  OMEPRAZOLE: '7646',
  PANTOPRAZOLE: '40790',
  ESOMEPRAZOLE: '283742',
  LANSOPRAZOLE: '17128',
  RABEPRAZOLE: '114979',
} as const;

/** Loop diuretics.
 *  AUDIT-052 partial mitigation (2026-05-06): canonical valueset created so inline arrays
 *  LOOP_DIURETIC_CODES_TH, LOOP_DIURETIC_CODES_OPT, DIURETIC_CODES_ELEC can import from canonical.
 *  All 4 loop diuretics included; all RxNav-verified per AUDIT_METHODOLOGY.md §16.
 *  Note: AUDIT-063 surfaced 4109 = ethacrynic acid (codebase comment claimed bumetanide); real
 *  bumetanide is 1808. Both are loop diuretics; both included for full coverage. */
export const RXNORM_LOOP_DIURETICS = {
  FUROSEMIDE: '4603',
  BUMETANIDE: '1808',
  TORSEMIDE: '38413',
  ETHACRYNIC_ACID: '4109',
} as const;

/** Thiazide and thiazide-like diuretics.
 *  AUDIT-052 partial mitigation (2026-05-06): canonical valueset created so DIURETIC_CODES_ELEC
 *  (currently mixes loops + HCTZ) can import from canonical for both thiazides + loops.
 *  All 4 standard thiazide-class diuretics included; all RxNav-verified per AUDIT_METHODOLOGY.md §16.
 *  Includes thiazide-like (chlorthalidone, indapamide, metolazone) per cardiology convention. */
export const RXNORM_THIAZIDES = {
  HYDROCHLOROTHIAZIDE: '5487',
  CHLORTHALIDONE: '2409',
  INDAPAMIDE: '5764',
  METOLAZONE: '6916',
} as const;

/** High-intensity statins -- used by PAD statin gap rule */
export const RXNORM_STATINS = {
  ATORVASTATIN: '83367',
  ROSUVASTATIN: '301542',
  SIMVASTATIN: '36567',
  PRAVASTATIN: '42463',
  PITAVASTATIN: '861634',
  LOVASTATIN: '6472',
  FLUVASTATIN: '41127',
} as const;

// ============================================================
// v3.0 HF buildout batch (2026-06-15). All ingredient (TTY=IN), RxNav-verified
// via rxcui.json?name=<drug>&tty=IN (the name->IN lookup, which structurally
// avoids the hand-entered wrong-CUI class - AUDIT-042/053/054/055/056/057/104).
// Provenance per set: source RxNav, date 2026-06-15, count = members.
// ============================================================

/** Fabry disease-modifying therapy (GAP-HF-061). Source: RxNav tty=IN, 2026-06-15, count 3.
 *  agalsidase alfa 2691830, agalsidase beta 338817, migalastat 2054252. */
export const RXNORM_FABRY_DMT = {
  AGALSIDASE_ALFA: '2691830',
  AGALSIDASE_BETA: '338817',
  MIGALASTAT: '2054252',
} as const;

/** IV inotropes (GAP-HF-047 inotrope dependence). Source: RxNav tty=IN, 2026-06-15, count 2.
 *  milrinone 52769, dobutamine 3616. */
export const RXNORM_INOTROPES = {
  MILRINONE: '52769',
  DOBUTAMINE: '3616',
} as const;

/** Tolvaptan - vasopressin V2 antagonist for hypervolemic/euvolemic hyponatremia (GAP-HF-132).
 *  Source: RxNav tty=IN, 2026-06-15, count 1. tolvaptan 358257. */
export const RXNORM_TOLVAPTAN = {
  TOLVAPTAN: '358257',
} as const;

/** Thyroid-directed therapy (GAP-HF-080 HF + thyroid dysfunction untreated). Covers both
 *  hypothyroid replacement and hyperthyroid suppression. Source: RxNav tty=IN, 2026-06-15, count 3.
 *  levothyroxine 10582, methimazole 6835, propylthiouracil 8794. */
export const RXNORM_THYROID_THERAPY = {
  LEVOTHYROXINE: '10582',
  METHIMAZOLE: '6835',
  PROPYLTHIOURACIL: '8794',
} as const;

/** Metformin (GAP-HF-082 HF + CKD + metformin renal-dose review). Source: RxNav tty=IN, 2026-06-15, count 1.
 *  metformin 6809. */
export const RXNORM_METFORMIN = {
  METFORMIN: '6809',
} as const;

/** Corticosteroids (GAP-HF-063 cardiac sarcoid immunosuppression; GAP-HF-144 pericarditis steroid).
 *  Source: RxNav tty=IN, 2026-06-15, count 1. prednisone 8640. */
export const RXNORM_CORTICOSTEROIDS = {
  PREDNISONE: '8640',
} as const;

/** Steroid-sparing immunosuppressants (GAP-HF-063 cardiac sarcoid). Source: RxNav tty=IN, 2026-06-15, count 3.
 *  methotrexate 6851, azathioprine 1256, mycophenolate mofetil 68149. */
export const RXNORM_STEROID_SPARING = {
  METHOTREXATE: '6851',
  AZATHIOPRINE: '1256',
  MYCOPHENOLATE_MOFETIL: '68149',
} as const;

/** IL-1 inhibitors (GAP-HF-144 recurrent pericarditis refractory). Source: RxNav tty=IN, 2026-06-15, count 3.
 *  rilonacept 763450 (RHAPSODY-approved for recurrent pericarditis), anakinra 72435, canakinumab 853491. */
export const RXNORM_IL1_INHIBITORS = {
  RILONACEPT: '763450',
  ANAKINRA: '72435',
  CANAKINUMAB: '853491',
} as const;

/** Octreotide (GAP-HF-148 post-LVAD GI bleeding from angiodysplasia). Source: RxNav tty=IN, 2026-06-15, count 1.
 *  octreotide 7617. */
export const RXNORM_OCTREOTIDE = {
  OCTREOTIDE: '7617',
} as const;
