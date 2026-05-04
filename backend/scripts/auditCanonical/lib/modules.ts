/**
 * Module configuration shared between extractSpec.ts and extractCode.ts.
 *
 * Spec line ranges are anchored to the current CK v4.0 source. When the spec is
 * re-versioned, these ranges are updated and a determinism test asserts the new
 * extraction matches.
 */

import * as path from 'path';
import type { ModuleConfig, ModuleCode } from './types';

export const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..');
export const SPEC_PATH = path.join(REPO_ROOT, 'docs', 'clinical', 'CLINICAL_KNOWLEDGE_BASE_v4.0.md');
export const EVALUATOR_PATH = path.join(REPO_ROOT, 'backend', 'src', 'ingestion', 'gaps', 'gapRuleEngine.ts');
export const CANONICAL_OUTPUT_DIR = path.join(REPO_ROOT, 'docs', 'audit', 'canonical');

export const EXTRACTOR_VERSION = '1.0.0';

export const MODULE_CONFIGS: readonly ModuleConfig[] = [
  {
    code: 'HF',
    enumName: 'HEART_FAILURE',
    specSection: '6.1',
    specLineRange: [120, 306],
    codePrefix: 'hf',
    specCodePrefix: 'HF',
  },
  {
    code: 'EP',
    enumName: 'ELECTROPHYSIOLOGY',
    specSection: '6.2',
    specLineRange: [307, 440],
    codePrefix: 'ep',
    specCodePrefix: 'EP',
  },
  {
    code: 'SH',
    enumName: 'STRUCTURAL_HEART',
    specSection: '6.3',
    specLineRange: [441, 585],
    codePrefix: 'sh',
    specCodePrefix: 'SH',
  },
  {
    code: 'CAD',
    enumName: 'CORONARY_INTERVENTION',
    specSection: '6.4',
    specLineRange: [586, 748],
    codePrefix: 'cad',
    specCodePrefix: 'CAD',
  },
  {
    code: 'VHD',
    enumName: 'VALVULAR_DISEASE',
    specSection: '6.5',
    specLineRange: [749, 926],
    codePrefix: 'vd',
    specCodePrefix: 'VHD',
  },
  {
    code: 'PV',
    enumName: 'PERIPHERAL_VASCULAR',
    specSection: '6.6',
    specLineRange: [927, 1112],
    codePrefix: 'pv',
    specCodePrefix: 'PV',
  },
];

export function getModuleConfig(code: ModuleCode): ModuleConfig {
  const cfg = MODULE_CONFIGS.find((m) => m.code === code);
  if (!cfg) {
    throw new Error(`Unknown module code "${code}". Valid: ${MODULE_CONFIGS.map((m) => m.code).join(', ')}`);
  }
  return cfg;
}
