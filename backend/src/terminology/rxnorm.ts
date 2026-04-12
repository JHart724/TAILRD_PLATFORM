/**
 * TAILRD Platform — RxNorm Drug Concept Lookup Service
 *
 * Complete drug class mappings for all medication-related gaps across
 * TAILRD's 6 cardiovascular modules.
 */

import { RxNormConcept, DrugClassMapping } from './types';

// ---------------------------------------------------------------------------
// Drug Class Mappings
// ---------------------------------------------------------------------------
export const DRUG_CLASSES: Record<string, DrugClassMapping> = {
  'SGLT2_INHIBITORS': {
    className: 'SGLT2 Inhibitors',
    ingredients: [
      { rxcui: '1545653', name: 'empagliflozin', brands: ['Jardiance'] },
      { rxcui: '2200644', name: 'dapagliflozin', brands: ['Farxiga'] },
      { rxcui: '1373463', name: 'canagliflozin', brands: ['Invokana'] },
      { rxcui: '2200202', name: 'ertugliflozin', brands: ['Steglatro'] },
    ]
  },
  'ARNI': {
    className: 'ARNI',
    ingredients: [
      { rxcui: '1656339', name: 'sacubitril/valsartan', brands: ['Entresto'] },
    ]
  },
  'PCSK9_INHIBITORS': {
    className: 'PCSK9 Inhibitors',
    ingredients: [
      { rxcui: '1854900', name: 'evolocumab', brands: ['Repatha'] },
      { rxcui: '1741193', name: 'alirocumab', brands: ['Praluent'] },
      { rxcui: '2397641', name: 'inclisiran', brands: ['Leqvio'] },
    ]
  },
  'GLP1_RA': {
    className: 'GLP-1 Receptor Agonists',
    ingredients: [
      { rxcui: '2200016', name: 'semaglutide', brands: ['Ozempic', 'Wegovy', 'Rybelsus'] },
      { rxcui: '2395492', name: 'tirzepatide', brands: ['Mounjaro', 'Zepbound'] },
      { rxcui: '475968', name: 'liraglutide', brands: ['Victoza', 'Saxenda'] },
      { rxcui: '897122', name: 'dulaglutide', brands: ['Trulicity'] },
      { rxcui: '1991306', name: 'exenatide ER', brands: ['Bydureon'] },
    ]
  },
  'BETA_BLOCKERS': {
    className: 'Beta-Blockers (Evidence-Based HF)',
    ingredients: [
      { rxcui: '20352', name: 'carvedilol', brands: ['Coreg'] },
      { rxcui: '6918', name: 'metoprolol succinate', brands: ['Toprol-XL'] },
      { rxcui: '1520', name: 'bisoprolol', brands: ['Zebeta'] },
      { rxcui: '6185', name: 'nebivolol', brands: ['Bystolic'] },
    ]
  },
  'MRA': {
    className: 'Mineralocorticoid Receptor Antagonists',
    ingredients: [
      { rxcui: '9997', name: 'spironolactone', brands: ['Aldactone'] },
      { rxcui: '3443', name: 'eplerenone', brands: ['Inspra'] },
      { rxcui: '2481926', name: 'finerenone', brands: ['Kerendia'] },
    ]
  },
  'ACE_INHIBITORS': {
    className: 'ACE Inhibitors',
    ingredients: [
      { rxcui: '3827', name: 'enalapril', brands: ['Vasotec'] },
      { rxcui: '7226', name: 'lisinopril', brands: ['Prinivil', 'Zestril'] },
      { rxcui: '8629', name: 'ramipril', brands: ['Altace'] },
      { rxcui: '7373', name: 'captopril', brands: ['Capoten'] },
    ]
  },
  'ARB': {
    className: 'Angiotensin II Receptor Blockers',
    ingredients: [
      { rxcui: '52175', name: 'losartan', brands: ['Cozaar'] },
      { rxcui: '69749', name: 'valsartan', brands: ['Diovan'] },
      { rxcui: '83818', name: 'candesartan', brands: ['Atacand'] },
    ]
  },
  'ANTICOAGULANTS_DOAC': {
    className: 'Direct Oral Anticoagulants',
    ingredients: [
      { rxcui: '1114195', name: 'apixaban', brands: ['Eliquis'] },
      { rxcui: '1364430', name: 'rivaroxaban', brands: ['Xarelto'] },
      { rxcui: '1037045', name: 'dabigatran', brands: ['Pradaxa'] },
      { rxcui: '1599538', name: 'edoxaban', brands: ['Savaysa'] },
    ]
  },
  'ANTICOAGULANTS_VKA': {
    className: 'Vitamin K Antagonists',
    ingredients: [
      { rxcui: '11289', name: 'warfarin', brands: ['Coumadin', 'Jantoven'] },
    ]
  },
  'ANTIARRHYTHMICS': {
    className: 'Antiarrhythmic Drugs',
    ingredients: [
      { rxcui: '596', name: 'amiodarone', brands: ['Pacerone', 'Cordarone'] },
      { rxcui: '3346', name: 'dofetilide', brands: ['Tikosyn'] },
      { rxcui: '3354', name: 'dronedarone', brands: ['Multaq'] },
      { rxcui: '9068', name: 'sotalol', brands: ['Betapace'] },
      { rxcui: '4099', name: 'flecainide', brands: ['Tambocor'] },
      { rxcui: '8182', name: 'propafenone', brands: ['Rythmol'] },
    ]
  },
  'STATINS': {
    className: 'HMG-CoA Reductase Inhibitors (Statins)',
    ingredients: [
      { rxcui: '36567', name: 'atorvastatin', brands: ['Lipitor'] },
      { rxcui: '301542', name: 'rosuvastatin', brands: ['Crestor'] },
      { rxcui: '8156', name: 'pravastatin', brands: ['Pravachol'] },
      { rxcui: '9145', name: 'simvastatin', brands: ['Zocor'] },
      { rxcui: '6472', name: 'pitavastatin', brands: ['Livalo'] },
    ]
  },
  'ANTIPLATELET': {
    className: 'Antiplatelet Agents',
    ingredients: [
      { rxcui: '1191', name: 'aspirin', brands: ['Bayer'] },
      { rxcui: '32968', name: 'clopidogrel', brands: ['Plavix'] },
      { rxcui: '1116632', name: 'ticagrelor', brands: ['Brilinta'] },
      { rxcui: '1730193', name: 'prasugrel', brands: ['Effient'] },
    ]
  },
  'TAFAMIDIS': {
    className: 'Transthyretin Stabilizers',
    ingredients: [
      { rxcui: '2169274', name: 'tafamidis', brands: ['Vyndaqel', 'Vyndamax'] },
    ]
  },
  'TTR_SILENCERS': {
    className: 'TTR Gene Silencers',
    ingredients: [
      { rxcui: '2384786', name: 'vutrisiran', brands: ['Amvuttra'] },
      { rxcui: '2181053', name: 'patisiran', brands: ['Onpattro'] },
    ]
  },
  'MYOSIN_INHIBITORS': {
    className: 'Cardiac Myosin Inhibitors',
    ingredients: [
      { rxcui: '2551804', name: 'mavacamten', brands: ['Camzyos'] },
      { rxcui: '2606847', name: 'aficamten', brands: ['Iqirvo'] },
    ]
  },
  'IVABRADINE': {
    className: 'If Channel Inhibitors',
    ingredients: [
      { rxcui: '1649380', name: 'ivabradine', brands: ['Corlanor'] },
    ]
  },
  'VERICIGUAT': {
    className: 'Soluble Guanylate Cyclase Stimulators',
    ingredients: [
      { rxcui: '2398091', name: 'vericiguat', brands: ['Verquvo'] },
    ]
  },
  'HYDRALAZINE_ISDN': {
    className: 'Hydralazine + Isosorbide Dinitrate',
    ingredients: [
      { rxcui: '5470', name: 'hydralazine', brands: ['Apresoline'] },
      { rxcui: '6058', name: 'isosorbide dinitrate', brands: ['Isordil'] },
    ]
  },
  'LIPID_LOWERING_OTHER': {
    className: 'Other Lipid-Lowering Agents',
    ingredients: [
      { rxcui: '3820', name: 'ezetimibe', brands: ['Zetia'] },
      { rxcui: '2380048', name: 'bempedoic acid', brands: ['Nexletol'] },
      { rxcui: '1553875', name: 'icosapent ethyl', brands: ['Vascepa'] },
    ]
  },
  'IV_IRON': {
    className: 'Intravenous Iron',
    ingredients: [
      { rxcui: '1313988', name: 'ferric carboxymaltose', brands: ['Injectafer'] },
      { rxcui: '1745880', name: 'ferric derisomaltose', brands: ['Monoferric'] },
      { rxcui: '7612', name: 'iron sucrose', brands: ['Venofer'] },
    ]
  },
  'DIGOXIN': {
    className: 'Cardiac Glycosides',
    ingredients: [
      { rxcui: '3407', name: 'digoxin', brands: ['Lanoxin'] },
    ]
  },
  'QT_PROLONGING': {
    className: 'QT-Prolonging Medications (High Risk)',
    ingredients: [
      { rxcui: '596', name: 'amiodarone', brands: ['Pacerone'] },
      { rxcui: '3346', name: 'dofetilide', brands: ['Tikosyn'] },
      { rxcui: '3354', name: 'dronedarone', brands: ['Multaq'] },
      { rxcui: '9068', name: 'sotalol', brands: ['Betapace'] },
      { rxcui: '8640', name: 'haloperidol', brands: ['Haldol'] },
      { rxcui: '7531', name: 'methadone', brands: ['Dolophine'] },
      { rxcui: '7049', name: 'ondansetron', brands: ['Zofran'] },
    ]
  },
  'COLCHICINE': {
    className: 'Colchicine',
    ingredients: [
      { rxcui: '2665', name: 'colchicine', brands: ['Colcrys', 'Mitigare'] },
    ]
  },
  'RANOLAZINE': {
    className: 'Ranolazine',
    ingredients: [
      { rxcui: '35829', name: 'ranolazine', brands: ['Ranexa'] },
    ]
  },
  'CILOSTAZOL': {
    className: 'Phosphodiesterase Inhibitors (PV)',
    ingredients: [
      { rxcui: '24592', name: 'cilostazol', brands: ['Pletal'] },
    ]
  },
};

// ---------------------------------------------------------------------------
// Build a flat lookup from RXCUI -> RxNormConcept
// ---------------------------------------------------------------------------
const RXCUI_INDEX: Map<string, RxNormConcept> = new Map();
const BRAND_INDEX: Map<string, RxNormConcept> = new Map();

function buildIndices(): void {
  for (const [classKey, mapping] of Object.entries(DRUG_CLASSES)) {
    for (const ing of mapping.ingredients) {
      const concept: RxNormConcept = {
        rxcui: ing.rxcui,
        name: ing.name,
        termType: 'IN',
        drugClasses: [classKey],
        brandNames: ing.brands,
      };

      // Merge if already exists (some RXCUIs appear in multiple classes, e.g. amiodarone)
      const existing = RXCUI_INDEX.get(ing.rxcui);
      if (existing) {
        existing.drugClasses = [...new Set([...existing.drugClasses, classKey])];
      } else {
        RXCUI_INDEX.set(ing.rxcui, concept);
      }

      // Brand index
      for (const brand of ing.brands) {
        BRAND_INDEX.set(brand.toLowerCase(), concept);
      }
    }
  }
}

buildIndices();

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Look up an RxNorm concept by RXCUI.
 */
export function getMedicationConcept(rxcui: string): RxNormConcept | undefined {
  return RXCUI_INDEX.get(rxcui);
}

/**
 * Look up an ingredient by brand name (case-insensitive).
 */
export function getIngredientFromBrand(brandName: string): RxNormConcept | undefined {
  return BRAND_INDEX.get(brandName.toLowerCase());
}

/**
 * Expand a drug class key to all RXCUIs in that class.
 */
export function expandDrugClass(className: string): string[] {
  const mapping = DRUG_CLASSES[className];
  if (!mapping) return [];
  return mapping.ingredients.map(i => i.rxcui);
}

/**
 * Check whether a given RXCUI matches any code in a target list.
 * Target list can contain individual RXCUIs or drug class keys (prefixed with 'CLASS:').
 */
export function matchesMedication(rxcui: string, targetCodes: string[]): boolean {
  for (const target of targetCodes) {
    if (target.startsWith('CLASS:')) {
      const classKey = target.substring(6);
      const classRxcuis = expandDrugClass(classKey);
      if (classRxcuis.includes(rxcui)) return true;
    } else if (target === rxcui) {
      return true;
    }
  }
  return false;
}

/**
 * Get the drug class name(s) an RXCUI belongs to. Returns the first class name.
 */
export function getDrugClassName(rxcui: string): string | undefined {
  const concept = RXCUI_INDEX.get(rxcui);
  if (!concept || concept.drugClasses.length === 0) return undefined;
  return DRUG_CLASSES[concept.drugClasses[0]]?.className;
}

/**
 * Get all RXCUIs in the registry.
 */
export function getAllRxcuis(): string[] {
  return Array.from(RXCUI_INDEX.keys());
}

/**
 * Get all drug class keys.
 */
export function getAllDrugClassKeys(): string[] {
  return Object.keys(DRUG_CLASSES);
}
