export interface CSVColumn {
  name: string;
  required: boolean;
  type: 'string' | 'number' | 'date' | 'boolean' | 'icd10' | 'cpt' | 'rxnorm' | 'pipe_delimited';
  validation?: { min?: number; max?: number; pattern?: RegExp };
}

export const COMMON_COLUMNS: CSVColumn[] = [
  { name: 'patient_id', required: true, type: 'string' },
  { name: 'age', required: true, type: 'number', validation: { min: 0, max: 120 } },
  { name: 'sex', required: true, type: 'string' },
  { name: 'encounter_date', required: true, type: 'date' },
  { name: 'encounter_type', required: false, type: 'string' },
  { name: 'primary_diagnosis', required: true, type: 'icd10' },
  { name: 'secondary_diagnoses', required: false, type: 'pipe_delimited' },
  { name: 'procedures', required: false, type: 'pipe_delimited' },
  { name: 'medications', required: false, type: 'pipe_delimited' },
];

export const HF_COLUMNS: CSVColumn[] = [
  { name: 'lvef', required: false, type: 'number', validation: { min: 0, max: 100 } },
  { name: 'lvef_date', required: false, type: 'date' },
  { name: 'nyha_class', required: false, type: 'number', validation: { min: 1, max: 4 } },
  { name: 'bnp', required: false, type: 'number', validation: { min: 0, max: 100000 } },
  { name: 'nt_probnp', required: false, type: 'number', validation: { min: 0, max: 500000 } },
  { name: 'ferritin', required: false, type: 'number' },
  { name: 'tsat', required: false, type: 'number', validation: { min: 0, max: 100 } },
  { name: 'sodium', required: false, type: 'number', validation: { min: 100, max: 180 } },
  { name: 'potassium', required: false, type: 'number', validation: { min: 1, max: 10 } },
  { name: 'egfr', required: false, type: 'number', validation: { min: 0, max: 200 } },
  { name: 'kccq_score', required: false, type: 'number', validation: { min: 0, max: 100 } },
];

export const EP_COLUMNS: CSVColumn[] = [
  { name: 'rhythm', required: false, type: 'string' },
  { name: 'qtc_interval', required: false, type: 'number', validation: { min: 200, max: 800 } },
  { name: 'qrs_duration', required: false, type: 'number', validation: { min: 50, max: 300 } },
  { name: 'device_type', required: false, type: 'string' },
  { name: 'device_implant_date', required: false, type: 'date' },
  { name: 'chadsvasc_score', required: false, type: 'number', validation: { min: 0, max: 9 } },
];

export const CAD_COLUMNS: CSVColumn[] = [
  { name: 'syntax_score', required: false, type: 'number' },
  { name: 'lvef', required: false, type: 'number', validation: { min: 0, max: 100 } },
  { name: 'last_pci_date', required: false, type: 'date' },
  { name: 'ldl', required: false, type: 'number' },
  { name: 'lpa', required: false, type: 'number' },
  { name: 'triglycerides', required: false, type: 'number' },
  { name: 'apob', required: false, type: 'number' },
];

export const SH_COLUMNS: CSVColumn[] = [
  { name: 'aortic_valve_vmax', required: false, type: 'number' },
  { name: 'aortic_valve_mean_gradient', required: false, type: 'number' },
  { name: 'aortic_valve_area', required: false, type: 'number' },
  { name: 'mitral_regurg_grade', required: false, type: 'number', validation: { min: 0, max: 4 } },
  { name: 'sts_score', required: false, type: 'number' },
  // TR + vena-contracta (v3.0 SH chunk 3). tr_regurg_grade is a 0-4 numeric TR grade (4 = severe),
  // mirroring mitral_regurg_grade; the coded valve_severity (0-5) is the cross-valve fallback.
  { name: 'tr_regurg_grade', required: false, type: 'number', validation: { min: 0, max: 4 } },
  { name: 'tr_regurg_vmax', required: false, type: 'number' },
  { name: 'mitral_vena_contracta', required: false, type: 'number' },
  { name: 'aortic_vena_contracta', required: false, type: 'number' },
  { name: 'tricuspid_vena_contracta', required: false, type: 'number' },
  // Chunk-2 MR rules read these but the CSV path silently dropped them (AUDIT-165 class); mitral_eroa also
  // threads via FHIR (29448-8), pasp via neither until now. ascending_aorta added for chunk-4 aortic-dimension
  // gaps (already in the FHIR map 18012-5).
  { name: 'mitral_eroa', required: false, type: 'number' },
  { name: 'pasp', required: false, type: 'number' },
  { name: 'ascending_aorta', required: false, type: 'number' },
];

export const PV_COLUMNS: CSVColumn[] = [
  { name: 'abi_right', required: false, type: 'number' },
  { name: 'abi_left', required: false, type: 'number' },
  { name: 'wound_present', required: false, type: 'boolean' },
  { name: 'wifi_score', required: false, type: 'string' },
];

export const VD_COLUMNS: CSVColumn[] = [
  { name: 'valve_lesion_type', required: false, type: 'string' },
  { name: 'valve_severity', required: false, type: 'string' },
  { name: 'last_echo_date', required: false, type: 'date' },
  { name: 'surgical_risk', required: false, type: 'string' },
  // INR for mechanical-valve anticoagulation (AUDIT-170 slug-fix, CSV path). reaches labValues['inr'].
  { name: 'inr', required: false, type: 'number' },
];

export function getModuleColumns(moduleId: string): CSVColumn[] {
  const moduleMap: Record<string, CSVColumn[]> = {
    hf: HF_COLUMNS,
    ep: EP_COLUMNS,
    cad: CAD_COLUMNS,
    sh: SH_COLUMNS,
    pv: PV_COLUMNS,
    vd: VD_COLUMNS,
  };
  return [...COMMON_COLUMNS, ...(moduleMap[moduleId] || [])];
}
