/**
 * CQL Gap Rule Registry
 *
 * Central index of all CQL gap rule definitions.
 * Each rule contains the CQL library string and metadata for the CQL engine.
 */

export { GAP_1_ATTR_CM_CQL, GAP_1_METADATA } from './gap1_attrCm.cql';
export { GAP_2_IRON_DEFICIENCY_CQL, GAP_2_METADATA } from './gap2_ironDeficiency.cql';
export { GAP_39_QTC_ALERT_CQL, GAP_39_METADATA } from './gap39_qtcAlert.cql';
export { GAP_44_DIGOXIN_TOXICITY_CQL, GAP_44_METADATA } from './gap44_digoxinToxicity.cql';
export { GAP_50_PREMATURE_DAPT_CQL, GAP_50_METADATA } from './gap50_prematureDapt.cql';

export const ALL_GAP_METADATA = [
  // Dynamically import metadata to avoid circular dependencies
  // In production, this would be populated by the rule loader
] as const;

/**
 * Get all gap rule definitions for loading into the CQL engine.
 */
export function getAllGapRules() {
  return [
    { cql: require('./gap1_attrCm.cql').GAP_1_ATTR_CM_CQL, metadata: require('./gap1_attrCm.cql').GAP_1_METADATA },
    { cql: require('./gap2_ironDeficiency.cql').GAP_2_IRON_DEFICIENCY_CQL, metadata: require('./gap2_ironDeficiency.cql').GAP_2_METADATA },
    { cql: require('./gap39_qtcAlert.cql').GAP_39_QTC_ALERT_CQL, metadata: require('./gap39_qtcAlert.cql').GAP_39_METADATA },
    { cql: require('./gap44_digoxinToxicity.cql').GAP_44_DIGOXIN_TOXICITY_CQL, metadata: require('./gap44_digoxinToxicity.cql').GAP_44_METADATA },
    { cql: require('./gap50_prematureDapt.cql').GAP_50_PREMATURE_DAPT_CQL, metadata: require('./gap50_prematureDapt.cql').GAP_50_METADATA },
  ];
}

/**
 * Module-level grouping for dashboard rendering
 */
export const GAP_MODULES = {
  HF: ['gap-1-attr-cm', 'gap-2-iron-deficiency-hf', 'gap-44-digoxin-toxicity'],
  EP: ['gap-39-qtc-safety'],
  Coronary: ['gap-50-premature-dapt'],
  Structural: [],
  PV: [],
  Valvular: [],
} as const;
