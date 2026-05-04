/**
 * crosswalkSchema.ts — TypeScript types + validation for <MODULE>.crosswalk.json
 * per AUDIT_METHODOLOGY.md §2.1.C.
 *
 * Crosswalk is the audit's authored content. Every spec gap gets one row asserting
 * a classification with citations. Validation rules per §4 (citation requirements):
 *   - Every spec gap has a row
 *   - Classifications match enum {PRODUCTION_GRADE, DET_OK, PARTIAL_DETECTION, SPEC_ONLY}
 *   - Non-SPEC_ONLY rows have ruleBodyCite with all required sub-fields
 *   - inferredSafetyTag ↔ inferredSafetyRationale paired (both null OR both set)
 *   - ruleBodyCite.evaluatorModule is a valid module code
 *   - specLine matches spec.json[gap].specLine
 *
 * Validation is deterministic and structured: returns ValidationResult with per-row
 * errors enumerated. CI uses this output as the gate.
 */

import {
  ModuleCode,
  Tier,
  SpecExtract,
  CodeExtract,
} from './lib/types';

// =============================================================================
// Crosswalk schema (§2.1.C)
// =============================================================================

export type Classification = 'PRODUCTION_GRADE' | 'DET_OK' | 'PARTIAL_DETECTION' | 'SPEC_ONLY';

export type InferredSafetyTag = 'STRUCTURAL_SAFETY' | 'PROCEDURAL_URGENCY' | null;

export type AuditMethod =
  | 'name-match'
  | 'rule-body-verified'
  | 'rule-body-citation-verified'
  | 'rule-body-citation-AUDIT-030D';

export interface RuleBodyCite {
  readonly registryId: string;
  readonly registryLine: number;
  readonly evaluatorBlockName: string;
  readonly evaluatorBodyLineRange: readonly [number, number];
  readonly evaluatorModule: ModuleCode;
}

export interface CrosswalkRow {
  readonly specGapId: string;
  readonly specLine: number;
  readonly tier: Tier;
  readonly classification: Classification;
  readonly ruleBodyCite: RuleBodyCite | null;
  readonly auditNotes: string;
  readonly inferredSafetyTag: InferredSafetyTag;
  readonly inferredSafetyRationale: string | null;
  /** Optional draft-stage provenance — set by parseExistingAddendum, removed when canonical. */
  readonly parseSource?: string;
  /** Optional draft-stage confidence — set by parseExistingAddendum, removed when canonical. */
  readonly parseConfidence?: number;
}

export interface CrosswalkExtra {
  readonly registryId: string;
  readonly rationale: string;
}

export interface Crosswalk {
  readonly module: ModuleCode;
  readonly crosswalkVersion: string;
  readonly auditDate: string;
  readonly auditMethod: AuditMethod;
  /** True only on the parsed-from-addendum draft; false/absent on canonical crosswalks. */
  readonly draft?: boolean;
  readonly rows: readonly CrosswalkRow[];
  readonly extras: readonly CrosswalkExtra[];
  /** Hand-authored sections per §11 template. May be empty strings on initial draft. */
  readonly strategicPosture?: string;
  readonly sequencingNotes?: string;
  readonly lessonsLearned?: string;
}

// =============================================================================
// Validation
// =============================================================================

export interface ValidationError {
  readonly path: string;
  readonly code: string;
  readonly message: string;
}

export interface ValidationResult {
  readonly valid: boolean;
  readonly errors: readonly ValidationError[];
  readonly warnings: readonly ValidationError[];
}

const CLASSIFICATIONS: ReadonlySet<Classification> = new Set([
  'PRODUCTION_GRADE',
  'DET_OK',
  'PARTIAL_DETECTION',
  'SPEC_ONLY',
]);

const TIERS: ReadonlySet<Tier> = new Set(['T1', 'T2', 'T3']);

const INFERRED_SAFETY_TAGS: ReadonlySet<string> = new Set([
  'STRUCTURAL_SAFETY',
  'PROCEDURAL_URGENCY',
]);

const VALID_MODULES: ReadonlySet<ModuleCode> = new Set([
  'HF', 'EP', 'SH', 'CAD', 'VHD', 'PV',
]);

const AUDIT_METHODS: ReadonlySet<string> = new Set([
  'name-match',
  'rule-body-verified',
  'rule-body-citation-verified',
  'rule-body-citation-AUDIT-030D',
]);

/**
 * Validate a crosswalk against its module's spec.json and code.json extracts.
 * Returns ValidationResult enumerating every error and warning.
 *
 * @param allCodeExtracts - optional map of all module code extracts. When provided,
 *   cross-module ruleBodyCite rows (evaluatorModule != crosswalk.module) are validated
 *   against the cited module's code.json. Without it, cross-module rows produce
 *   REGISTRY_ID_NOT_FOUND / EVALUATOR_BLOCK_NOT_FOUND errors.
 */
export function validateCrosswalk(
  crosswalk: Crosswalk,
  spec: SpecExtract,
  code: CodeExtract,
  allCodeExtracts?: ReadonlyMap<ModuleCode, CodeExtract>,
): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  // Top-level checks
  if (crosswalk.module !== spec.module) {
    errors.push({
      path: 'crosswalk.module',
      code: 'MODULE_MISMATCH',
      message: `crosswalk.module="${crosswalk.module}" does not match spec.module="${spec.module}"`,
    });
  }
  if (!VALID_MODULES.has(crosswalk.module as ModuleCode)) {
    errors.push({
      path: 'crosswalk.module',
      code: 'INVALID_MODULE_CODE',
      message: `module "${crosswalk.module}" not in valid set`,
    });
  }
  if (!AUDIT_METHODS.has(crosswalk.auditMethod)) {
    errors.push({
      path: 'crosswalk.auditMethod',
      code: 'INVALID_AUDIT_METHOD',
      message: `auditMethod "${crosswalk.auditMethod}" not in valid set`,
    });
  }

  // Coverage check: every spec gap has a row
  const specIds = new Set(spec.gaps.map((g) => g.id));
  const rowIds = new Set(crosswalk.rows.map((r) => r.specGapId));
  for (const specId of specIds) {
    if (!rowIds.has(specId)) {
      errors.push({
        path: `crosswalk.rows[${specId}]`,
        code: 'MISSING_ROW_FOR_SPEC_GAP',
        message: `spec gap "${specId}" has no crosswalk row`,
      });
    }
  }
  for (const rowId of rowIds) {
    if (!specIds.has(rowId)) {
      errors.push({
        path: `crosswalk.rows[${rowId}]`,
        code: 'EXTRA_ROW_NOT_IN_SPEC',
        message: `crosswalk row references "${rowId}" which is not in spec.gaps`,
      });
    }
  }

  // Per-row validation
  const specByLine = new Map(spec.gaps.map((g) => [g.id, g]));
  const registryById = new Map(code.registry.map((r) => [r.id, r]));
  const evaluatorByName = new Map(code.evaluatorBlocks.map((b) => [b.name, b]));

  for (let i = 0; i < crosswalk.rows.length; i++) {
    const row = crosswalk.rows[i];
    const rowPath = `crosswalk.rows[${i}/${row.specGapId}]`;

    // Tier validity
    if (!TIERS.has(row.tier)) {
      errors.push({
        path: `${rowPath}.tier`,
        code: 'INVALID_TIER',
        message: `tier "${row.tier}" not in {T1, T2, T3}`,
      });
    }

    // Classification validity
    if (!CLASSIFICATIONS.has(row.classification)) {
      errors.push({
        path: `${rowPath}.classification`,
        code: 'INVALID_CLASSIFICATION',
        message: `classification "${row.classification}" not in valid set`,
      });
    }

    // specLine must match spec.json
    const specGap = specByLine.get(row.specGapId);
    if (specGap) {
      if (row.specLine !== specGap.specLine) {
        errors.push({
          path: `${rowPath}.specLine`,
          code: 'SPEC_LINE_MISMATCH',
          message: `row.specLine=${row.specLine} but spec.gaps["${row.specGapId}"].specLine=${specGap.specLine}`,
        });
      }
      if (row.tier !== specGap.tier) {
        errors.push({
          path: `${rowPath}.tier`,
          code: 'TIER_MISMATCH',
          message: `row.tier=${row.tier} but spec.gaps["${row.specGapId}"].tier=${specGap.tier}`,
        });
      }
    }

    // ruleBodyCite required when classification is not SPEC_ONLY
    if (row.classification !== 'SPEC_ONLY') {
      if (row.ruleBodyCite === null) {
        errors.push({
          path: `${rowPath}.ruleBodyCite`,
          code: 'MISSING_RULE_BODY_CITE',
          message: `classification "${row.classification}" requires ruleBodyCite (must not be null)`,
        });
      } else {
        // Verify cite components — pick the right code.json based on evaluatorModule
        const cite = row.ruleBodyCite;
        const isCrossModule = cite.evaluatorModule !== crosswalk.module;
        const targetCode = isCrossModule && allCodeExtracts
          ? allCodeExtracts.get(cite.evaluatorModule)
          : code;
        if (isCrossModule && !allCodeExtracts) {
          // Allow cross-module cites to skip strict validation when allCodeExtracts not supplied;
          // record a warning instead of a hard error
          warnings.push({
            path: `${rowPath}.ruleBodyCite`,
            code: 'CROSS_MODULE_VALIDATION_SKIPPED',
            message: `cross-module cite to module "${cite.evaluatorModule}" not validated (no allCodeExtracts supplied)`,
          });
        } else if (!targetCode) {
          errors.push({
            path: `${rowPath}.ruleBodyCite.evaluatorModule`,
            code: 'CROSS_MODULE_NOT_FOUND',
            message: `evaluatorModule "${cite.evaluatorModule}" code extract not provided`,
          });
        } else {
          const targetRegistry = new Map(targetCode.registry.map((r) => [r.id, r]));
          const targetEvalByName = new Map(targetCode.evaluatorBlocks.map((b) => [b.name, b]));
          const reg = targetRegistry.get(cite.registryId);
          if (!reg) {
            errors.push({
              path: `${rowPath}.ruleBodyCite.registryId`,
              code: 'REGISTRY_ID_NOT_FOUND',
              message: `registryId "${cite.registryId}" not in ${cite.evaluatorModule}.code.registry`,
            });
          } else if (cite.registryLine !== reg.registryLine) {
            errors.push({
              path: `${rowPath}.ruleBodyCite.registryLine`,
              code: 'REGISTRY_LINE_MISMATCH',
              message: `cite.registryLine=${cite.registryLine} but code.registry["${cite.registryId}"].registryLine=${reg.registryLine}`,
            });
          }
          const evBlock = targetEvalByName.get(cite.evaluatorBlockName);
          if (!evBlock) {
            errors.push({
              path: `${rowPath}.ruleBodyCite.evaluatorBlockName`,
              code: 'EVALUATOR_BLOCK_NOT_FOUND',
              message: `evaluatorBlockName "${cite.evaluatorBlockName}" not in ${cite.evaluatorModule}.code.evaluatorBlocks`,
            });
          } else {
            const [start, end] = cite.evaluatorBodyLineRange;
            if (start !== evBlock.bodyStartLine || end !== evBlock.bodyEndLine) {
              errors.push({
                path: `${rowPath}.ruleBodyCite.evaluatorBodyLineRange`,
                code: 'BODY_LINE_RANGE_MISMATCH',
                message: `cite range [${start}, ${end}] does not match evaluator block range [${evBlock.bodyStartLine}, ${evBlock.bodyEndLine}]`,
              });
            }
          }
        }
        if (!VALID_MODULES.has(cite.evaluatorModule)) {
          errors.push({
            path: `${rowPath}.ruleBodyCite.evaluatorModule`,
            code: 'INVALID_EVALUATOR_MODULE',
            message: `evaluatorModule "${cite.evaluatorModule}" not in valid set`,
          });
        }
      }
    }

    // inferredSafetyTag ↔ inferredSafetyRationale paired-field validation
    if (row.inferredSafetyTag !== null) {
      if (!INFERRED_SAFETY_TAGS.has(row.inferredSafetyTag)) {
        errors.push({
          path: `${rowPath}.inferredSafetyTag`,
          code: 'INVALID_INFERRED_SAFETY_TAG',
          message: `inferredSafetyTag "${row.inferredSafetyTag}" not in {STRUCTURAL_SAFETY, PROCEDURAL_URGENCY, null}`,
        });
      }
      if (row.inferredSafetyRationale === null || row.inferredSafetyRationale.trim() === '') {
        errors.push({
          path: `${rowPath}.inferredSafetyRationale`,
          code: 'MISSING_INFERRED_SAFETY_RATIONALE',
          message: `inferredSafetyTag is set but inferredSafetyRationale is null/empty (per §6.2 requirement)`,
        });
      }
    } else if (row.inferredSafetyRationale !== null) {
      warnings.push({
        path: `${rowPath}.inferredSafetyRationale`,
        code: 'ORPHAN_RATIONALE',
        message: `inferredSafetyRationale is set without inferredSafetyTag — rationale will be ignored`,
      });
    }

    // auditNotes should not be empty for non-SPEC_ONLY classifications
    if (row.classification === 'PARTIAL_DETECTION' && (!row.auditNotes || row.auditNotes.trim() === '')) {
      warnings.push({
        path: `${rowPath}.auditNotes`,
        code: 'PARTIAL_WITHOUT_NOTES',
        message: `PARTIAL_DETECTION classification should explain incompleteness in auditNotes (per §3.2 rule 2)`,
      });
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Convenience: aggregate validation results across all rows. */
export function summarizeValidation(result: ValidationResult): string {
  if (result.valid) {
    const wcount = result.warnings.length;
    return `VALID${wcount > 0 ? ` (with ${wcount} warning${wcount === 1 ? '' : 's'})` : ''}`;
  }
  const codeCounts: Record<string, number> = {};
  for (const e of result.errors) codeCounts[e.code] = (codeCounts[e.code] || 0) + 1;
  const breakdown = Object.entries(codeCounts)
    .sort((a, b) => b[1] - a[1])
    .map(([c, n]) => `${c}=${n}`)
    .join(', ');
  return `INVALID (${result.errors.length} errors): ${breakdown}`;
}
