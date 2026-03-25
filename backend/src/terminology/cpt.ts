/**
 * TAILRD Platform — CPT/HCPCS Procedure Code Lookup Service
 *
 * Procedure codes for structural heart, coronary, EP/device, HF device,
 * imaging, and peripheral vascular interventions.
 */

import { CPTCode } from './types';

// ---------------------------------------------------------------------------
// Master CPT Registry
// ---------------------------------------------------------------------------
export const CPT_CODES: Record<string, CPTCode> = {
  // =========================================================================
  // STRUCTURAL HEART
  // =========================================================================
  '33361': { code: '33361', description: 'TAVR - transapical approach', category: 'Structural Heart' },
  '33362': { code: '33362', description: 'TAVR - transapical approach, with cardiopulmonary bypass', category: 'Structural Heart' },
  '33363': { code: '33363', description: 'TAVR - transfemoral approach', category: 'Structural Heart' },
  '33364': { code: '33364', description: 'TAVR - open approach, axillary artery', category: 'Structural Heart' },
  '33365': { code: '33365', description: 'TAVR - transaortic approach', category: 'Structural Heart' },
  '33366': { code: '33366', description: 'TAVR - transcaval approach', category: 'Structural Heart' },
  '33367': { code: '33367', description: 'TAVR - cardiopulmonary bypass support', category: 'Structural Heart' },
  '33368': { code: '33368', description: 'TAVR - percutaneous femoral artery conduit', category: 'Structural Heart' },
  '33369': { code: '33369', description: 'TAVR - open femoral artery conduit', category: 'Structural Heart' },
  '0345T': { code: '0345T', description: 'TMVR - transcatheter mitral valve replacement', category: 'Structural Heart' },
  '0346T': { code: '0346T', description: 'TMVR - with cardiopulmonary bypass', category: 'Structural Heart' },
  '0347T': { code: '0347T', description: 'TMVR - open approach', category: 'Structural Heart' },
  '33418': { code: '33418', description: 'TEER - transcatheter mitral valve repair (MitraClip), initial', category: 'Structural Heart' },
  '33419': { code: '33419', description: 'TEER - transcatheter mitral valve repair, additional', category: 'Structural Heart' },
  '0544T': { code: '0544T', description: 'TEER - transcatheter tricuspid valve repair, initial', category: 'Structural Heart' },
  '0545T': { code: '0545T', description: 'TEER - transcatheter tricuspid valve repair, additional', category: 'Structural Heart' },
  '33477': { code: '33477', description: 'TPVR - transcatheter pulmonary valve replacement', category: 'Structural Heart' },

  // =========================================================================
  // CORONARY INTERVENTION
  // =========================================================================
  '92928': { code: '92928', description: 'PCI with stent, single vessel', category: 'Coronary' },
  '92929': { code: '92929', description: 'PCI with stent, each additional branch', category: 'Coronary' },
  '92933': { code: '92933', description: 'PCI with atherectomy, single vessel', category: 'Coronary' },
  '92934': { code: '92934', description: 'PCI with atherectomy, each additional branch', category: 'Coronary' },
  '92920': { code: '92920', description: 'PCI balloon angioplasty, single vessel', category: 'Coronary' },
  '92921': { code: '92921', description: 'PCI balloon angioplasty, each additional branch', category: 'Coronary' },
  '93454': { code: '93454', description: 'Catheter placement in coronary artery for coronary angiography', category: 'Coronary' },
  '93455': { code: '93455', description: 'Coronary angiography with left heart catheterization', category: 'Coronary' },
  '93456': { code: '93456', description: 'Coronary angiography with right heart catheterization', category: 'Coronary' },
  '93457': { code: '93457', description: 'Coronary angiography with left and right heart cath', category: 'Coronary' },
  '93458': { code: '93458', description: 'Left heart catheterization with coronary angiography and LV angiography', category: 'Coronary' },
  '93459': { code: '93459', description: 'Left heart cath with coronary angiography, LV angiography, and bypass angiography', category: 'Coronary' },
  '93460': { code: '93460', description: 'Right and left heart cath with coronary and LV angiography', category: 'Coronary' },
  '93461': { code: '93461', description: 'Right and left heart cath with coronary, LV, and bypass angiography', category: 'Coronary' },
  '93571': { code: '93571', description: 'Intravascular Doppler flow velocity (FFR/iFR), initial vessel', category: 'Coronary' },
  '93572': { code: '93572', description: 'Intravascular Doppler flow velocity, each additional vessel', category: 'Coronary' },
  '92978': { code: '92978', description: 'Intravascular ultrasound (IVUS), initial vessel', category: 'Coronary' },
  '92979': { code: '92979', description: 'Intravascular ultrasound (IVUS), each additional vessel', category: 'Coronary' },

  // CABG
  '33510': { code: '33510', description: 'CABG, vein only, single graft', category: 'Coronary' },
  '33511': { code: '33511', description: 'CABG, vein only, two grafts', category: 'Coronary' },
  '33512': { code: '33512', description: 'CABG, vein only, three grafts', category: 'Coronary' },
  '33513': { code: '33513', description: 'CABG, vein only, four grafts', category: 'Coronary' },
  '33514': { code: '33514', description: 'CABG, vein only, five grafts', category: 'Coronary' },
  '33516': { code: '33516', description: 'CABG, vein only, six or more grafts', category: 'Coronary' },
  '33533': { code: '33533', description: 'CABG, arterial, single graft', category: 'Coronary' },
  '33534': { code: '33534', description: 'CABG, arterial, two grafts', category: 'Coronary' },
  '33535': { code: '33535', description: 'CABG, arterial, three grafts', category: 'Coronary' },
  '33536': { code: '33536', description: 'CABG, arterial, four or more grafts', category: 'Coronary' },

  // =========================================================================
  // EP / DEVICE
  // =========================================================================
  '93656': { code: '93656', description: 'AF ablation - comprehensive EP evaluation and ablation', category: 'Electrophysiology' },
  '93653': { code: '93653', description: 'EP ablation - SVT ablation', category: 'Electrophysiology' },
  '93654': { code: '93654', description: 'EP ablation - VT ablation with 3D mapping', category: 'Electrophysiology' },
  '93655': { code: '93655', description: 'EP ablation - additional SVT during VT ablation', category: 'Electrophysiology' },
  '93620': { code: '93620', description: 'EP study - comprehensive, without ablation', category: 'Electrophysiology' },
  '93621': { code: '93621', description: 'EP study - left atrial pacing and recording', category: 'Electrophysiology' },
  '93622': { code: '93622', description: 'EP study - left ventricular pacing and recording', category: 'Electrophysiology' },
  '93623': { code: '93623', description: 'EP study - programmed stimulation after IV drug', category: 'Electrophysiology' },

  // Pacemaker/ICD
  '33206': { code: '33206', description: 'Insertion of pacemaker, atrial', category: 'Device' },
  '33207': { code: '33207', description: 'Insertion of pacemaker, ventricular', category: 'Device' },
  '33208': { code: '33208', description: 'Insertion of pacemaker, dual-chamber', category: 'Device' },
  '33225': { code: '33225', description: 'Insertion of LV electrode for biventricular pacing (CRT)', category: 'Device' },
  '33230': { code: '33230', description: 'Insertion of ICD pulse generator, dual lead', category: 'Device' },
  '33231': { code: '33231', description: 'Insertion of ICD pulse generator, multiple leads', category: 'Device' },
  '33240': { code: '33240', description: 'Insertion of ICD pulse generator only', category: 'Device' },
  '33249': { code: '33249', description: 'Insertion of ICD, single or dual chamber', category: 'Device' },

  // ILR
  '33285': { code: '33285', description: 'Insertion of implantable loop recorder (ILR)', category: 'Device' },

  // LAAC
  '33340': { code: '33340', description: 'Left atrial appendage closure (LAAC/Watchman)', category: 'Structural Heart' },

  // CardioMEMS
  '33289': { code: '33289', description: 'Transcatheter implantation of wireless pulmonary artery pressure sensor (CardioMEMS)', category: 'Device' },

  // =========================================================================
  // HF DEVICES
  // =========================================================================
  '33975': { code: '33975', description: 'LVAD implantation, extracorporeal', category: 'Device' },
  '33976': { code: '33976', description: 'LVAD implantation, intracorporeal', category: 'Device' },
  '93264': { code: '93264', description: 'Remote monitoring of wireless pulmonary artery pressure sensor', category: 'Device' },

  // =========================================================================
  // IMAGING
  // =========================================================================
  '78816': { code: '78816', description: 'Tc-99m PYP scan (cardiac amyloid)', category: 'Imaging' },
  '75574': { code: '75574', description: 'Coronary CT angiography (CCTA)', category: 'Imaging' },
  '78452': { code: '78452', description: 'Nuclear stress test (MPI), multiple studies', category: 'Imaging' },
  '76706': { code: '76706', description: 'AAA screening ultrasound', category: 'Imaging' },
  '93350': { code: '93350', description: 'Stress echocardiography', category: 'Imaging' },
  '93306': { code: '93306', description: 'Transthoracic echocardiography, complete', category: 'Imaging' },
  '93312': { code: '93312', description: 'Transesophageal echocardiography (TEE)', category: 'Imaging' },
  '93303': { code: '93303', description: 'Transthoracic echocardiography, follow-up or limited', category: 'Imaging' },
  '93351': { code: '93351', description: 'Stress echo with Doppler and color flow', category: 'Imaging' },

  // =========================================================================
  // PERIPHERAL VASCULAR
  // =========================================================================
  '37228': { code: '37228', description: 'Revascularization, tibial/peroneal, initial vessel, angioplasty', category: 'Peripheral Vascular' },
  '37229': { code: '37229', description: 'Revascularization, tibial/peroneal, initial vessel, atherectomy', category: 'Peripheral Vascular' },
  '37230': { code: '37230', description: 'Revascularization, tibial/peroneal, initial vessel, stent', category: 'Peripheral Vascular' },
  '37224': { code: '37224', description: 'Revascularization, iliac, initial vessel, angioplasty', category: 'Peripheral Vascular' },
  '37225': { code: '37225', description: 'Revascularization, iliac, initial vessel, stent', category: 'Peripheral Vascular' },
  '37226': { code: '37226', description: 'Revascularization, femoral/popliteal, initial vessel, angioplasty', category: 'Peripheral Vascular' },
  '37227': { code: '37227', description: 'Revascularization, femoral/popliteal, initial vessel, stent', category: 'Peripheral Vascular' },
  '36475': { code: '36475', description: 'Endovenous ablation, first vein treated', category: 'Peripheral Vascular' },
  '37191': { code: '37191', description: 'IVC filter insertion', category: 'Peripheral Vascular' },
  '37192': { code: '37192', description: 'IVC filter repositioning', category: 'Peripheral Vascular' },
  '37193': { code: '37193', description: 'IVC filter retrieval', category: 'Peripheral Vascular' },
  '34701': { code: '34701', description: 'EVAR, standard, infrarenal abdominal aortic aneurysm', category: 'Peripheral Vascular' },
  '34702': { code: '34702', description: 'EVAR, standard, infrarenal AAA, with rupture', category: 'Peripheral Vascular' },
  '93922': { code: '93922', description: 'ABI - limited bilateral noninvasive physiologic study', category: 'Peripheral Vascular' },
  '93923': { code: '93923', description: 'ABI - complete bilateral noninvasive physiologic study', category: 'Peripheral Vascular' },
};

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/**
 * Validate a CPT code format. Standard 5-digit or tracking (4 digits + T).
 */
export function validateCPT(code: string): boolean {
  return /^\d{5}$/.test(code) || /^\d{4}T$/.test(code);
}

/**
 * Get the description for a CPT code.
 */
export function getDescription(code: string): string {
  return CPT_CODES[code]?.description ?? 'Unknown';
}

/**
 * Get a CPT code object.
 */
export function getCode(code: string): CPTCode | undefined {
  return CPT_CODES[code];
}

/**
 * Get all CPT codes in a category.
 */
export function getCodesByCategory(category: string): CPTCode[] {
  return Object.values(CPT_CODES).filter(c => c.category === category);
}

/**
 * Check whether a procedure code matches any in a list.
 */
export function matchesAny(code: string, codeList: string[]): boolean {
  return codeList.includes(code);
}

/**
 * Expand a CPT range string like '33361-33369' into individual codes.
 * Only works for numeric CPT codes (not tracking codes ending in T).
 */
export function expandRange(rangeStr: string): string[] {
  const parts = rangeStr.split('-');
  if (parts.length !== 2) return [rangeStr];

  const start = parts[0].trim();
  const end = parts[1].trim();

  // Handle tracking codes (ending in T)
  if (start.endsWith('T') || end.endsWith('T')) {
    return [start, end];
  }

  const startNum = parseInt(start, 10);
  const endNum = parseInt(end, 10);
  if (isNaN(startNum) || isNaN(endNum) || startNum > endNum) return [rangeStr];

  const result: string[] = [];
  for (let i = startNum; i <= endNum; i++) {
    const code = i.toString().padStart(5, '0');
    if (CPT_CODES[code]) {
      result.push(code);
    }
  }
  return result.length > 0 ? result : [rangeStr];
}
